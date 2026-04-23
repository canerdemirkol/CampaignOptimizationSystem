import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { BaseRepository } from '../../infrastructure/repositories';
import { Customer } from '../../domain/entities/customer.entity';

@Injectable()
export class CustomerRepository extends BaseRepository<Customer> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Customer');
  }

  protected getDelegate() {
    return this.prisma.customer;
  }

  protected toDomain(data: any): Customer {
    return new Customer({
      id: data.id,
      customerNo: data.customerNo,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      age: data.age,
      gender: data.gender,
      segment: data.segment,
      churnScore: data.churnScore,
      lifetimeValue: data.lifetimeValue,
      incomeLevelId: data.incomeLevelId,
      incomeLevel: data.incomeLevel,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  // Override create to include incomeLevel
  async create(data: any): Promise<Customer> {
    const record = await (this.delegate as any).create({
      data,
      include: { incomeLevel: true },
    });
    return this.toDomain(record);
  }

  // Override findById to include incomeLevel
  async findById(id: string): Promise<Customer> {
    const record = await (this.delegate as any).findUnique({
      where: { id },
      include: { incomeLevel: true },
    });
    if (!record) {
      throw new Error(`Customer with id ${id} not found`);
    }
    return this.toDomain(record);
  }

  // Override update to include incomeLevel in response
  async update(id: string, data: any): Promise<Customer> {
    const record = await (this.delegate as any).update({
      where: { id },
      data,
      include: { incomeLevel: true },
    });
    return this.toDomain(record);
  }

  // Override findAll to include incomeLevel
  async findAll(page = 1, limit = 10, orderBy: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' }) {
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      (this.delegate as any).findMany({ skip, take: limit, orderBy, include: { incomeLevel: true } }),
      (this.delegate as any).count(),
    ]);

    return {
      data: records.map((r: any) => this.toDomain(r)),
      total,
      page,
      limit,
    };
  }

  async findByCustomerNo(customerNo: string): Promise<Customer | null> {
    const record = await (this.delegate as any).findFirst({
      where: { customerNo },
      include: { incomeLevel: true },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const record = await (this.delegate as any).findFirst({ where: { email } });
    return record ? this.toDomain(record) : null;
  }

  async findDuplicateByNoOrEmail(customerNo: string, email: string, excludeId?: string) {
    return (this.delegate as any).findFirst({
      where: {
        OR: [{ customerNo }, { email }],
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
  }

  async findExistingNoAndEmails(): Promise<{ customerNo: string; email: string }[]> {
    return (this.delegate as any).findMany({
      select: { customerNo: true, email: true },
    });
  }

  async findAllRaw(): Promise<any[]> {
    return (this.delegate as any).findMany();
  }
}
