import { PrismaClient, CampaignType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CryptoService } from '../src/infrastructure/crypto/crypto.service';

// Load .env
dotenv.config();

// Decrypt DATABASE_URL if encrypted
const encryptionKey = process.env.ENCRYPTION_KEY || '';
const databaseUrl = CryptoService.decryptEnvValue(process.env.DATABASE_URL, encryptionKey);

const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl },
  },
});

// Campaign generation constants
const TOTAL_CAMPAIGNS = 30;
const CRM_CAMPAIGN_COUNT = 20; // campaign_0..campaign_19 are CRM; campaign_20..campaign_29 are MASS
const CAMPAIGN_R_MIN = 50000;
const CAMPAIGN_R_MAX = 200000;

// General parameter bounds (per user spec)
const DEFAULT_PARAMS = {
  cMin: 5,
  cMax: 10, // Selectable CRM campaign count
  nMin: 1,
  nMax: 5, // Per-customer campaign count
  bMin: 100,
  bMax: 50_000_000,
  mMin: 2,
  mMax: 5, // Selectable MASS campaign count
};

// Batch sizes for bulk inserts
const SEGMENT_BATCH_SIZE = 2_000;
const SCORE_BATCH_SIZE = 10_000;

// Cost/profit table driven by 1-indexed campaign position (1..50)
// i.e. campaign_0 -> position 1, campaign_49 -> position 50
function getCampaignCostByPosition(position1Based: number): number {
  if (position1Based <= 10) return 10;
  if (position1Based <= 20) return 15;
  if (position1Based <= 30) return 20;
  if (position1Based <= 40) return 10;
  return 25;
}

function getCampaignProfitByPosition(position1Based: number): number {
  if (position1Based <= 10) return 25;
  if (position1Based <= 20) return 30;
  if (position1Based <= 30) return 60;
  if (position1Based <= 40) return 20;
  return 50;
}

// Resolve data.xlsx location for both dev (ts-node) and compiled (dist-seed) contexts
function resolveDataXlsxPath(): string {
  const candidates = [
    path.join(__dirname, 'data.xlsx'), // dev: backend/prisma/data.xlsx
    path.join(__dirname, '..', '..', 'prisma', 'data.xlsx'), // prod: dist-seed/prisma/ -> prisma/
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`data.xlsx not found. Looked in: ${candidates.join(', ')}`);
  }
  return found;
}

interface SegmentCountRow {
  segmentId: number;
  count: number;
}

interface CampaignScoresRow {
  segmentId: number;
  scores: number[]; // length === TOTAL_CAMPAIGNS
}

async function loadXlsxData(): Promise<{
  segmentCounts: SegmentCountRow[];
  campaignScores: CampaignScoresRow[];
}> {
  const xlsxPath = resolveDataXlsxPath();
  console.log(`Loading xlsx from: ${xlsxPath}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);

  const segmentCountsSheet = workbook.getWorksheet('segment_counts');
  const campaignMeansSheet = workbook.getWorksheet('campaign_means');
  if (!segmentCountsSheet || !campaignMeansSheet) {
    throw new Error('Required sheets (segment_counts, campaign_means) not found in data.xlsx');
  }

  const segmentCounts: SegmentCountRow[] = [];
  segmentCountsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const segmentId = Number(row.getCell(1).value);
    const count = Number(row.getCell(2).value);
    if (Number.isFinite(segmentId) && Number.isFinite(count)) {
      segmentCounts.push({ segmentId, count });
    }
  });

  const campaignScores: CampaignScoresRow[] = [];
  campaignMeansSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const segmentId = Number(row.getCell(1).value);
    if (!Number.isFinite(segmentId)) return;
    const scores: number[] = [];
    for (let i = 0; i < TOTAL_CAMPAIGNS; i++) {
      const cell = row.getCell(2 + i);
      scores.push(Number(cell.value));
    }
    campaignScores.push({ segmentId, scores });
  });

  console.log(`Loaded ${segmentCounts.length} segment counts and ${campaignScores.length} campaign score rows`);
  return { segmentCounts, campaignScores };
}

async function seedUsers() {
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('Created admin user:', admin.username);

  const userPasswordHash = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      email: 'user@example.com',
      passwordHash: userPasswordHash,
      role: 'USER',
      isActive: true,
    },
  });
  console.log('Created regular user:', user.username);

  const viewerPasswordHash = await bcrypt.hash('viewer123', 10);
  const viewer = await prisma.user.upsert({
    where: { username: 'viewer' },
    update: {},
    create: {
      username: 'viewer',
      email: 'viewer@example.com',
      passwordHash: viewerPasswordHash,
      role: 'VIEWER',
      isActive: true,
    },
  });
  console.log('Created viewer user:', viewer.username);
}

async function seedIncomeLevels(): Promise<Record<string, string>> {
  const incomeLevelsData = [
    { name: 'Low', displayName: 'Düşük', description: 'Düşük gelir seviyesi' },
    { name: 'Medium-Low', displayName: 'Düşük-Orta', description: 'Düşük-orta gelir seviyesi' },
    { name: 'Medium', displayName: 'Orta', description: 'Orta gelir seviyesi' },
    { name: 'Medium-High', displayName: 'Orta-Yüksek', description: 'Orta-yüksek gelir seviyesi' },
    { name: 'High', displayName: 'Yüksek', description: 'Yüksek gelir seviyesi' },
  ];

  const incomeLevelMap: Record<string, string> = {};
  for (const level of incomeLevelsData) {
    const created = await prisma.incomeLevel.upsert({
      where: { name: level.name },
      update: {},
      create: level,
    });
    incomeLevelMap[level.name] = created.id;
  }
  console.log('Created income levels');
  return incomeLevelMap;
}

async function seedCustomers(incomeLevelMap: Record<string, string>) {
  const customers = [
    { customerNo: 'CUST001', firstName: 'John', lastName: 'Doe', email: 'john@example.com', age: 35, gender: 'M', segment: 'Premium', churnScore: 0.15, lifetimeValue: 5000, incomeLevelId: incomeLevelMap['High'] },
    { customerNo: 'CUST002', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', age: 28, gender: 'F', segment: 'Standard', churnScore: 0.25, lifetimeValue: 3000, incomeLevelId: incomeLevelMap['Medium'] },
    { customerNo: 'CUST003', firstName: 'Bob', lastName: 'Johnson', email: 'bob@example.com', age: 45, gender: 'M', segment: 'Premium', churnScore: 0.10, lifetimeValue: 8000, incomeLevelId: incomeLevelMap['High'] },
    { customerNo: 'CUST004', firstName: 'Alice', lastName: 'Williams', email: 'alice@example.com', age: 32, gender: 'F', segment: 'Basic', churnScore: 0.35, lifetimeValue: 1500, incomeLevelId: incomeLevelMap['Low'] },
    { customerNo: 'CUST005', firstName: 'Charlie', lastName: 'Brown', email: 'charlie@example.com', age: 50, gender: 'M', segment: 'Premium', churnScore: 0.08, lifetimeValue: 12000, incomeLevelId: incomeLevelMap['High'] },
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { customerNo: customer.customerNo },
      update: {},
      create: {
        customerNo: customer.customerNo,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        age: customer.age,
        gender: customer.gender as any,
        segment: customer.segment,
        churnScore: customer.churnScore,
        lifetimeValue: customer.lifetimeValue,
        incomeLevelId: customer.incomeLevelId,
      },
    });
  }
  console.log('Created sample customers');
}

async function seedDefaultGeneralParameters() {
  const existing = await prisma.defaultGeneralParameters.findFirst();
  if (existing) {
    console.log('Default general parameters already exist, skipping');
    return;
  }
  await prisma.defaultGeneralParameters.create({ data: DEFAULT_PARAMS });
  console.log('Created default general parameters');
}

// Creates 10 000 customer segments from segment_counts sheet.
// Segment name directly reflects xlsx segment_id (e.g. segment_id=1273 -> "Segment 1273")
// so that count values in UI line up with the xlsx row that has the same id.
async function seedCustomerSegments(
  segmentCounts: SegmentCountRow[],
  incomeLevelMap: Record<string, string>,
): Promise<Map<number, string>> {
  const existingCount = await prisma.customerSegment.count();
  if (existingCount > 0) {
    console.log(`Customer segments already exist (${existingCount}), loading id map`);
    const existing = await prisma.customerSegment.findMany({ select: { id: true, name: true } });
    const map = new Map<number, string>();
    for (const seg of existing) {
      const match = seg.name.match(/^Segment (\d+)$/);
      if (match) {
        map.set(parseInt(match[1], 10), seg.id);
      }
    }
    return map;
  }

  const incomeLevelKeys = Object.keys(incomeLevelMap);
  const segmentIdMap = new Map<number, string>();
  const records = segmentCounts.map(({ segmentId, count }) => {
    const id = uuidv4();
    segmentIdMap.set(segmentId, id);
    return {
      id,
      name: `Segment ${segmentId}`,
      description: `Müşteri segmenti ${segmentId}`,
      customerCount: count,
      lifetimeValue: Math.round((Math.random() * 14000 + 1000) * 100) / 100,
      incomeLevelId: incomeLevelMap[incomeLevelKeys[segmentId % incomeLevelKeys.length]],
    };
  });

  for (let i = 0; i < records.length; i += SEGMENT_BATCH_SIZE) {
    const batch = records.slice(i, i + SEGMENT_BATCH_SIZE);
    await prisma.customerSegment.createMany({ data: batch, skipDuplicates: true });
    console.log(`Inserted segments ${i + 1}..${i + batch.length}`);
  }
  console.log(`Created ${records.length} customer segments`);
  return segmentIdMap;
}

// Creates campaign_0..campaign_49 with CRM/MASS split and cost/profit per user spec.
async function seedCampaigns(): Promise<Map<number, string>> {
  const existingCount = await prisma.campaign.count();
  if (existingCount > 0) {
    console.log(`Campaigns already exist (${existingCount}), loading id map`);
    const existing = await prisma.campaign.findMany({ select: { id: true, name: true } });
    const map = new Map<number, string>();
    for (const c of existing) {
      const match = c.name.match(/^campaign_(\d+)$/);
      if (match) {
        map.set(parseInt(match[1], 10), c.id);
      }
    }
    return map;
  }

  const campaignIdMap = new Map<number, string>();
  const records = Array.from({ length: TOTAL_CAMPAIGNS }, (_, idx) => {
    const id = uuidv4();
    campaignIdMap.set(idx, id);
    const position1Based = idx + 1;
    const type: CampaignType = idx < CRM_CAMPAIGN_COUNT ? CampaignType.CRM : CampaignType.MASS;
    return {
      id,
      name: `campaign_${idx}`,
      type,
      rMin: CAMPAIGN_R_MIN,
      rMax: CAMPAIGN_R_MAX,
      zK: getCampaignProfitByPosition(position1Based),
      cK: getCampaignCostByPosition(position1Based),
    };
  });

  await prisma.campaign.createMany({ data: records, skipDuplicates: true });
  console.log(`Created ${records.length} campaigns (${CRM_CAMPAIGN_COUNT} CRM, ${TOTAL_CAMPAIGNS - CRM_CAMPAIGN_COUNT} MASS)`);
  return campaignIdMap;
}

// Creates CampaignCustomerSegmentScore rows (10 000 segments × 50 campaigns) from campaign_means sheet.
async function seedCampaignSegmentScores(
  campaignScores: CampaignScoresRow[],
  segmentIdMap: Map<number, string>,
  campaignIdMap: Map<number, string>,
) {
  const existingCount = await prisma.campaignCustomerSegmentScore.count();
  if (existingCount > 0) {
    console.log(`Campaign-segment scores already exist (${existingCount}), skipping`);
    return;
  }

  const buffer: { campaignId: string; customerSegmentId: string; score: number }[] = [];
  let totalInserted = 0;

  const flush = async () => {
    if (buffer.length === 0) return;
    await prisma.campaignCustomerSegmentScore.createMany({ data: buffer, skipDuplicates: true });
    totalInserted += buffer.length;
    console.log(`Inserted scores: ${totalInserted}`);
    buffer.length = 0;
  };

  for (const row of campaignScores) {
    const segmentUuid = segmentIdMap.get(row.segmentId);
    if (!segmentUuid) continue;
    for (let k = 0; k < TOTAL_CAMPAIGNS; k++) {
      const campaignUuid = campaignIdMap.get(k);
      if (!campaignUuid) continue;
      const score = row.scores[k];
      if (!Number.isFinite(score)) continue;
      buffer.push({ campaignId: campaignUuid, customerSegmentId: segmentUuid, score });
      if (buffer.length >= SCORE_BATCH_SIZE) {
        await flush();
      }
    }
  }
  await flush();
  console.log(`Created ${totalInserted} campaign-customer-segment scores`);
}

async function main() {
  console.log('Seeding database...');
  console.log('DATABASE_URL decrypted successfully via CryptoService');

  await seedUsers();
  const incomeLevelMap = await seedIncomeLevels();
  await seedCustomers(incomeLevelMap);
  await seedDefaultGeneralParameters();

  const { segmentCounts, campaignScores } = await loadXlsxData();
  const segmentIdMap = await seedCustomerSegments(segmentCounts, incomeLevelMap);
  const campaignIdMap = await seedCampaigns();
  await seedCampaignSegmentScores(campaignScores, segmentIdMap, campaignIdMap);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
