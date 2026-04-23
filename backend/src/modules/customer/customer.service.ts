import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CustomerRepository } from './customer.repository';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Customer } from '../../domain/entities/customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import * as ExcelJS from 'exceljs';

const TEMPLATE_COLUMNS = [
  { header: 'Customer No', key: 'customerNo', width: 15 },
  { header: 'First Name', key: 'firstName', width: 15 },
  { header: 'Last Name', key: 'lastName', width: 15 },
  { header: 'Email', key: 'email', width: 25 },
  { header: 'Phone', key: 'phone', width: 18 },
  { header: 'Age', key: 'age', width: 8 },
  { header: 'Gender (M/F/O)', key: 'gender', width: 15 },
  { header: 'Segment', key: 'segment', width: 15 },
  { header: 'Churn Score (0-1)', key: 'churnScore', width: 18 },
  { header: 'Lifetime Value', key: 'lifetimeValue', width: 15 },
  { header: 'Income Level ID', key: 'incomeLevelId', width: 25 },
];

export interface BulkImportResult {
  total: number;
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

@Injectable()
export class CustomerService {
  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getAll(): Promise<Customer[]> {
    return this.customerRepo.findMany();
  }

  async findAll(page = 1, limit = 10) {
    return this.customerRepo.findAll(page, limit);
  }

  async findById(id: string): Promise<Customer> {
    return this.customerRepo.findById(id);
  }

  async findByCustomerNo(customerNo: string): Promise<Customer> {
    const customer = await this.customerRepo.findByCustomerNo(customerNo);
    if (!customer) {
      throw new NotFoundException(`Customer with customerNo ${customerNo} not found`);
    }
    return customer;
  }

  private async resolveIncomeLevelId(incomeLevelName?: string): Promise<string | undefined> {
    if (!incomeLevelName) return undefined;
    const incomeLevel = await this.prisma.incomeLevel.findUnique({
      where: { name: incomeLevelName },
    });
    if (!incomeLevel) {
      throw new BadRequestException(`Income level "${incomeLevelName}" not found`);
    }
    return incomeLevel.id;
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const existing = await this.customerRepo.findDuplicateByNoOrEmail(dto.customerNo, dto.email);
    if (existing) {
      throw new ConflictException('Customer with same customerNo or email already exists');
    }
    const incomeLevelId = await this.resolveIncomeLevelId(dto.incomeLevel);
    return this.customerRepo.create({
      customerNo: dto.customerNo,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      age: dto.age,
      gender: dto.gender as any,
      segment: dto.segment,
      churnScore: dto.churnScore,
      lifetimeValue: dto.lifetimeValue,
      incomeLevelId,
    });
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    await this.customerRepo.findById(id);
    if (dto.email) {
      const existingEmail = await this.customerRepo.findDuplicateByNoOrEmail('', dto.email, id);
      if (existingEmail) {
        throw new ConflictException('Email already in use');
      }
    }
    const incomeLevelId = await this.resolveIncomeLevelId(dto.incomeLevel);
    return this.customerRepo.update(id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      age: dto.age,
      gender: dto.gender as any,
      segment: dto.segment,
      churnScore: dto.churnScore,
      lifetimeValue: dto.lifetimeValue,
      incomeLevelId,
    });
  }

  async delete(id: string): Promise<void> {
    await this.customerRepo.findById(id);
    await this.customerRepo.delete(id);
  }

  // ── Excel Template Generation with IncomeLevel Sheet ──

  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Customers template
    const customerSheet = workbook.addWorksheet('Customers');
    customerSheet.columns = TEMPLATE_COLUMNS;

    // Style header row
    const headerRow = customerSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
    headerRow.alignment = { horizontal: 'center' };

    // Add sample row
    customerSheet.addRow({
      customerNo: 'CUST001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+905551234567',
      age: 35,
      gender: 'M',
      segment: 'Premium',
      churnScore: 0.15,
      lifetimeValue: 5000,
      incomeLevelId: 'Orta-Yüksek veya UUID buraya gelir',
    });

    // Sheet 2: Income Levels reference
    const incomeLevels = await this.prisma.incomeLevel.findMany();
    const incomeSheet = workbook.addWorksheet('Income Levels');

    incomeSheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Name', key: 'name', width: 15 },
      { header: 'Display Name', key: 'displayName', width: 15 },
      { header: 'Description', key: 'description', width: 30 },
    ];

    const incomeHeaderRow = incomeSheet.getRow(1);
    incomeHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    incomeHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF388E3C' } };
    incomeHeaderRow.alignment = { horizontal: 'center' };

    incomeLevels.forEach((level) => {
      incomeSheet.addRow({
        id: level.id,
        name: level.name,
        displayName: level.displayName,
        description: level.description || '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ── Bulk Import from Excel ──

  async bulkImportFromExcel(fileBuffer: Buffer): Promise<BulkImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

    const sheet = workbook.getWorksheet(1);
    if (!sheet) {
      throw new BadRequestException('Excel file has no worksheets');
    }

    const result: BulkImportResult = { total: 0, inserted: 0, skipped: 0, errors: [] };

    // Read header row to map columns
    const headerRow = sheet.getRow(1);
    const colMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const val = String(cell.value || '').trim().toLowerCase();
      if (val.includes('customer no')) colMap['customerNo'] = colNumber;
      else if (val.includes('first name')) colMap['firstName'] = colNumber;
      else if (val.includes('last name')) colMap['lastName'] = colNumber;
      else if (val === 'email') colMap['email'] = colNumber;
      else if (val === 'phone') colMap['phone'] = colNumber;
      else if (val === 'age') colMap['age'] = colNumber;
      else if (val.includes('gender')) colMap['gender'] = colNumber;
      else if (val === 'segment') colMap['segment'] = colNumber;
      else if (val.includes('churn')) colMap['churnScore'] = colNumber;
      else if (val.includes('lifetime') || val === 'ltv') colMap['lifetimeValue'] = colNumber;
      else if (val.includes('income')) colMap['incomeLevelId'] = colNumber;
    });

    if (!colMap['customerNo'] || !colMap['firstName'] || !colMap['lastName'] || !colMap['email']) {
      throw new BadRequestException(
        'Missing required columns: Customer No, First Name, Last Name, Email. Please use the template.',
      );
    }

    // Fetch existing customerNo and email for duplicate check
    const existingCustomers = await this.customerRepo.findExistingNoAndEmails();
    const existingNos = new Set(existingCustomers.map(c => c.customerNo));
    const existingEmails = new Set(existingCustomers.map(c => c.email));

    const rowsToInsert: any[] = [];

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);

      const cellVal = (key: string) => {
        const col = colMap[key];
        if (!col) return undefined;
        const val = row.getCell(col).value;
        if (val === null || val === undefined) return undefined;
        if (typeof val === 'object' && val !== null && 'text' in val) {
          return (val as { text: string }).text;
        }
        return val;
      };

      const customerNo = String(cellVal('customerNo') || '').trim();
      const firstName = String(cellVal('firstName') || '').trim();
      const lastName = String(cellVal('lastName') || '').trim();
      const email = String(cellVal('email') || '').trim();

      // Skip empty rows
      if (!customerNo && !firstName && !lastName && !email) continue;

      result.total++;

      if (!customerNo || !firstName || !lastName || !email) {
        result.errors.push({ row: rowNum, reason: 'Missing required fields (customerNo, firstName, lastName, email)' });
        continue;
      }

      if (existingNos.has(customerNo)) {
        result.skipped++;
        result.errors.push({ row: rowNum, reason: `Customer No "${customerNo}" already exists` });
        continue;
      }
      if (existingEmails.has(email)) {
        result.skipped++;
        result.errors.push({ row: rowNum, reason: `Email "${email}" already exists` });
        continue;
      }

      if (rowsToInsert.some(r => r.customerNo === customerNo || r.email === email)) {
        result.skipped++;
        result.errors.push({ row: rowNum, reason: `Duplicate customerNo or email within file` });
        continue;
      }

      const phone = cellVal('phone') ? String(cellVal('phone')).trim() : undefined;
      const ageVal = cellVal('age');
      const age = ageVal !== undefined ? Number(ageVal) : undefined;
      const gender = cellVal('gender') ? String(cellVal('gender')).trim() : undefined;
      const segment = cellVal('segment') ? String(cellVal('segment')).trim() : undefined;
      const churnVal = cellVal('churnScore');
      const churnScore = churnVal !== undefined ? Number(churnVal) : undefined;
      const ltvVal = cellVal('lifetimeValue');
      const lifetimeValue = ltvVal !== undefined ? Number(ltvVal) : undefined;
      const incomeLevelId = cellVal('incomeLevelId') ? String(cellVal('incomeLevelId')).trim() : undefined;

      rowsToInsert.push({
        customerNo,
        firstName,
        lastName,
        email,
        phone,
        age: age && !isNaN(age) ? age : undefined,
        gender: gender as any,
        segment,
        churnScore: churnScore !== undefined && !isNaN(churnScore) ? churnScore : undefined,
        lifetimeValue: lifetimeValue !== undefined && !isNaN(lifetimeValue) ? lifetimeValue : undefined,
        incomeLevelId,
      });

      existingNos.add(customerNo);
      existingEmails.add(email);
    }

    if (rowsToInsert.length > 0) {
      await this.customerRepo.createMany(rowsToInsert);
      result.inserted = rowsToInsert.length;
    }

    return result;
  }
}
