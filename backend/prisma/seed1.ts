import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { CryptoService } from '../src/infrastructure/crypto/crypto.service';
import { v4 as uuidv4 } from 'uuid';

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

async function main() {
  console.log('Seeding database...');
  console.log('DATABASE_URL decrypted successfully via CryptoService');

  // Create admin user
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

  // Create regular user
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

  // Create viewer user
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

  // Create income levels first (predefined categories)
  const incomeLevelsData = [
    { name: 'Low', displayName: 'Düşük', description: 'Düşük gelir seviyesi' },
    { name: 'Medium-Low', displayName: 'Düşük-Orta', description: 'Düşük-orta gelir seviyesi' },
    { name: 'Medium', displayName: 'Orta', description: 'Orta gelir seviyesi' },
    { name: 'Medium-High', displayName: 'Orta-Yüksek', description: 'Orta-yüksek gelir seviyesi' },
    { name: 'High', displayName: 'Yüksek', description: 'Yüksek gelir seviyesi' },
  ];

  const incomeLevelMap: { [key: string]: string } = {};
  for (const level of incomeLevelsData) {
    const created = await prisma.incomeLevel.upsert({
      where: { name: level.name },
      update: {},
      create: level,
    });
    incomeLevelMap[level.name] = created.id;
  }
  console.log('Created income levels');

  // Create sample customers with income level references
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

  // Create default general parameters (global defaults)
  const existingDefaults = await prisma.defaultGeneralParameters.findFirst();
  if (!existingDefaults) {
    await prisma.defaultGeneralParameters.create({
      data: {
        cMin: 1, cMax: 10,
        nMin: 1, nMax: 5,
        bMin: 100, bMax: 50000000,
        mMin: 0, mMax: 3,
      },
    });
    console.log('Created default general parameters');
  } else {
    console.log('Default general parameters already exist, skipping');
  }

  // Create 20 customer segments
  const incomeLevelKeys = Object.keys(incomeLevelMap);
  const segmentsData = Array.from({ length: 20 }, (_, idx) => ({
    name: `Segment ${idx + 1}`,
    description: `Müşteri segmenti ${idx + 1}`,
    customerCount: Math.floor(Math.random() * 20000) + 1000,
    lifetimeValue: Math.round((Math.random() * 14000 + 1000) * 100) / 100,
    incomeLevelId: incomeLevelMap[incomeLevelKeys[idx % incomeLevelKeys.length]],
  }));

  const segmentMap: { [key: string]: string } = {};
  for (const seg of segmentsData) {
    const created = await prisma.customerSegment.upsert({
      where: { name: seg.name },
      update: {},
      create: seg,
    });
    segmentMap[seg.name] = created.id;
  }
  console.log('Created 20 customer segments');

  // Create test campaigns with fixed c_k values
  const campaignCosts: { [key: number]: number } = {
    1: 114.7216154,
    2: 58.49678671,
    3: 143.5311137,
    4: 113.0703855,
    5: 71.4558224,
    6: 177.569105,
    7: 50.35792756,
    8: 12.8210124,
    9: 170.0246574,
    10: 82.41905517,
    11: 166.0397031,
    12: 86.14713855,
    13: 45.94424232,
    14: 28.57960727,
    15: 167.2801717,
    16: 93.34267622,
    17: 66.01578847,
    18: 175.5143945,
    19: 97.99412107,
    20: 180.750666,
  };

  const campaignProfits: { [key: number]: number } = {
    1: 65.18732745,
    2: 164.7002483,
    3: 134.9174385,
    4: 61.82482293,
    5: 166.839315,
    6: 160.8868607,
    7: 60.07476777,
    8: 189.6037629,
    9: 149.0428595,
    10: 78.18864046,
    11: 178.01527,
    12: 50.20675135,
    13: 123.86139,
    14: 98.91479604,
    15: 109.9040013,
    16: 178.9427355,
    17: 85.68537121,
    18: 55.48142917,
    19: 146.9403396,
    20: 174.1189888,
  };

  // Helper function to generate random parameters (except c_k and z_k)
  const getRandomCampaignParams = (campaignIndex: number) => ({
    rMin: Math.floor(Math.random() * 200) + 50,    // 50-250
    rMax: Math.floor(Math.random() * 3000) + 2000, // 2000-5000
    zK: campaignProfits[campaignIndex],
    cK: campaignCosts[campaignIndex],
  });

  // CRM Campaigns (campaign-1 to campaign-10)
  for (let i = 1; i <= 10; i++) {
    const campaignName = `campaign-${i}`;
    const existing = await prisma.campaign.findFirst({
      where: { name: campaignName },
    });
    if (!existing) {
      const params = getRandomCampaignParams(i);
      await prisma.campaign.create({
        data: {
          id: uuidv4(),
          name: campaignName,
          type: 'CRM',
          rMin: params.rMin,
          rMax: params.rMax,
          zK: params.zK,
          cK: params.cK,
        },
      });
    }
  }
  console.log('Created 10 CRM test campaigns (campaign-1 to campaign-10)');

  // MASS Campaigns (campaign-11 to campaign-20)
  for (let i = 11; i <= 20; i++) {
    const campaignName = `campaign-${i}`;
    const existing = await prisma.campaign.findFirst({
      where: { name: campaignName },
    });
    if (!existing) {
      const params = getRandomCampaignParams(i);
      await prisma.campaign.create({
        data: {
          id: uuidv4(),
          name: campaignName,
          type: 'MASS',
          rMin: params.rMin,
          rMax: params.rMax,
          zK: params.zK,
          cK: params.cK,
        },
      });
    }
  }
  console.log('Created 10 MASS test campaigns (campaign-11 to campaign-20)');

  // Create campaign-customer-segment scores (p_ik values from spreadsheet)
  // p_ik[segment_i][campaign_k] - 20 segments × 20 campaigns
  const pik: number[][] = [
    // i=1
    [0.490243229, 0.882572508, 0.697498363, 0.451990893, 0.281166146, 0.539741268, 0.817294536, 0.164839275, 0.728451963, 0.395618274, 0.614582937, 0.842917365, 0.279483156, 0.583649271, 0.947218365, 0.321746958, 0.716482935, 0.458291637, 0.839174526, 0.192745863],
    // i=2
    [0.731584296, 0.215839471, 0.548273916, 0.862417593, 0.317528946, 0.648291573, 0.192847365, 0.874291536, 0.429173856, 0.691384275, 0.184729365, 0.537281946, 0.814729356, 0.362918475, 0.729481365, 0.481739265, 0.618472935, 0.294738165, 0.847291365, 0.563182947],
    // i=3
    [0.163829475, 0.547291836, 0.829174365, 0.294718356, 0.718293465, 0.482917365, 0.847291536, 0.318472965, 0.692841375, 0.241738965, 0.819472365, 0.364829175, 0.741829365, 0.482917356, 0.138294765, 0.629481375, 0.847291365, 0.571839246, 0.294718365, 0.819473256],
    // i=4
    [0.852917463, 0.374829156, 0.618294735, 0.142917365, 0.928374156, 0.264718935, 0.713829465, 0.539174826, 0.381729465, 0.814729365, 0.427381956, 0.682917435, 0.253847196, 0.791482365, 0.614829375, 0.348291765, 0.924718365, 0.163847295, 0.729481356, 0.481739265],
    // i=5
    [0.314829576, 0.741829365, 0.192847365, 0.681729435, 0.453829176, 0.829174365, 0.271839465, 0.914728365, 0.562917435, 0.138294765, 0.729483156, 0.891472365, 0.418293765, 0.634829175, 0.281739465, 0.947281365, 0.514829375, 0.842917365, 0.371829465, 0.692841375],
    // i=6
    [0.672917435, 0.413829576, 0.928174365, 0.524718935, 0.183729465, 0.762917365, 0.641829475, 0.289174365, 0.471839265, 0.852917365, 0.918274365, 0.147382951, 0.829174365, 0.341829475, 0.714829365, 0.482917365, 0.231748965, 0.614829375, 0.952817365, 0.138294765],
    // i=7
    [0.918274365, 0.162839475, 0.481729365, 0.729481365, 0.614829375, 0.342917365, 0.891472365, 0.418293765, 0.752917365, 0.513829476, 0.281739465, 0.634829175, 0.172839465, 0.941728365, 0.562917435, 0.819472365, 0.394718265, 0.714829365, 0.482917365, 0.253847196],
    // i=8
    [0.241839475, 0.634829175, 0.172839465, 0.952817365, 0.819472365, 0.491738265, 0.352917465, 0.781729365, 0.142917365, 0.672917435, 0.581739465, 0.829174365, 0.914728365, 0.261839475, 0.431729365, 0.714829365, 0.852917365, 0.341829475, 0.618294735, 0.972817365],
    // i=9
    [0.581739465, 0.872917365, 0.318294765, 0.413829576, 0.729481365, 0.152917365, 0.618294735, 0.941728365, 0.281739465, 0.829174365, 0.462917365, 0.714829365, 0.381729465, 0.524718935, 0.891472365, 0.172839465, 0.641829475, 0.928174365, 0.413829576, 0.762917365],
    // i=10
    [0.413829576, 0.291738465, 0.762917365, 0.581739465, 0.142917365, 0.918274365, 0.534829176, 0.872917365, 0.614829375, 0.391728465, 0.741829365, 0.182739465, 0.652917435, 0.829174365, 0.472917365, 0.264718935, 0.914728365, 0.531829476, 0.781729365, 0.318294765],
    // i=11
    [0.791482365, 0.534829176, 0.142917365, 0.672917435, 0.891472365, 0.413829576, 0.729481365, 0.162839475, 0.952817365, 0.281739465, 0.634829175, 0.472917365, 0.819472365, 0.192847365, 0.741829365, 0.581739465, 0.314829576, 0.862917365, 0.152917365, 0.941728365],
    // i=12
    [0.132917465, 0.718293465, 0.862917365, 0.341829475, 0.572917365, 0.231748965, 0.814729365, 0.652917435, 0.413829576, 0.918274365, 0.172839465, 0.841729365, 0.591738465, 0.729481365, 0.362918475, 0.814729365, 0.472917365, 0.281739465, 0.641829475, 0.531829476],
    // i=13
    [0.652917435, 0.381729465, 0.214829375, 0.891472365, 0.472917365, 0.718293465, 0.142917365, 0.829174365, 0.562917435, 0.714829365, 0.391728465, 0.253847196, 0.672917435, 0.413829576, 0.928174365, 0.281739465, 0.752917365, 0.618294735, 0.841729365, 0.172839465],
    // i=14
    [0.872917365, 0.142917365, 0.634829175, 0.271839465, 0.814729365, 0.562917435, 0.928174365, 0.472917365, 0.718293465, 0.352917465, 0.862917365, 0.914728365, 0.132917465, 0.581739465, 0.241839475, 0.691384275, 0.829174365, 0.413829576, 0.562917435, 0.718293465],
    // i=15
    [0.362918475, 0.952817365, 0.472917365, 0.714829365, 0.253847196, 0.829174365, 0.413829576, 0.591738465, 0.132917465, 0.641829475, 0.514829375, 0.762917365, 0.281739465, 0.852917365, 0.672917435, 0.142917365, 0.524718935, 0.791482365, 0.431729365, 0.914728365],
    // i=16
    [0.524718935, 0.182739465, 0.741829365, 0.928174365, 0.362918475, 0.152917365, 0.681729435, 0.819472365, 0.241839475, 0.472917365, 0.928174365, 0.314829576, 0.841729365, 0.618294735, 0.192847365, 0.534829176, 0.762917365, 0.452917365, 0.814729365, 0.271839465],
    // i=17
    [0.941728365, 0.614829375, 0.381729465, 0.524718935, 0.872917365, 0.291738465, 0.562917435, 0.142917365, 0.729481365, 0.814729365, 0.241839475, 0.591738465, 0.431729365, 0.762917365, 0.814729365, 0.918274365, 0.182739465, 0.634829175, 0.271839465, 0.852917365],
    // i=18
    [0.281739465, 0.829174365, 0.914728365, 0.452917365, 0.634829175, 0.741829365, 0.318294765, 0.531829476, 0.862917365, 0.192847365, 0.672917435, 0.418293765, 0.752917365, 0.142917365, 0.534829176, 0.381729465, 0.841729365, 0.962817365, 0.714829365, 0.431729365],
    // i=19
    [0.714829365, 0.462917365, 0.271839465, 0.829174365, 0.192847365, 0.572917365, 0.814729365, 0.381729465, 0.618294735, 0.941728365, 0.413829576, 0.829174365, 0.291738465, 0.672917435, 0.452917365, 0.729481365, 0.618294735, 0.142917365, 0.581739465, 0.362918475],
    // i=20
    [0.452917365, 0.819472365, 0.591738465, 0.314829576, 0.762917365, 0.418293765, 0.172839465, 0.952817365, 0.514829375, 0.729481365, 0.852917365, 0.562917435, 0.481739265, 0.918274365, 0.314829576, 0.472917365, 0.291738465, 0.819472365, 0.928174365, 0.614829375],
  ];

  // Get all campaigns (sorted by name to ensure consistent ordering)
  const allCampaigns = await prisma.campaign.findMany({
    orderBy: { name: 'asc' },
  });

  // Sort campaigns by their number: campaign-1, campaign-2, ..., campaign-20
  allCampaigns.sort((a, b) => {
    const numA = parseInt(a.name.replace('campaign-', ''));
    const numB = parseInt(b.name.replace('campaign-', ''));
    return numA - numB;
  });

  // Create scores for all segment-campaign combinations using p_ik matrix
  const segmentNames = Object.keys(segmentMap);
  for (let i = 0; i < 20; i++) {
    const segmentId = segmentMap[segmentNames[i]];
    for (let k = 0; k < 20; k++) {
      const campaign = allCampaigns[k];
      if (!campaign) continue;
      await prisma.campaignCustomerSegmentScore.upsert({
        where: {
          campaignId_customerSegmentId: {
            campaignId: campaign.id,
            customerSegmentId: segmentId,
          },
        },
        update: {},
        create: {
          campaignId: campaign.id,
          customerSegmentId: segmentId,
          score: pik[i][k],
        },
      });
    }
  }
  console.log('Created campaign-customer-segment scores (20x20 p_ik matrix)');

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
