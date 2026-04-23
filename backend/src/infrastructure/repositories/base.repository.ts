import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Generic Base Repository - abstracts common Prisma CRUD operations.
 *
 * Type Parameters:
 *   TEntity   – Domain entity returned from the repository
 *   TCreate   – Shape accepted by Prisma `create({ data })`
 *   TUpdate   – Shape accepted by Prisma `update({ data })`
 *   TDelegate – Prisma model delegate (e.g. PrismaService['campaign'])
 */
export abstract class BaseRepository<
  TEntity,
  TCreate = any,
  TUpdate = any,
  TDelegate = any,
> {
  protected readonly delegate: TDelegate;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly entityName: string,
  ) {
    this.delegate = this.getDelegate();
  }

  /** Subclass returns its Prisma delegate, e.g. this.prisma.campaign */
  protected abstract getDelegate(): TDelegate;

  /** Subclass maps a raw Prisma record to a domain entity */
  protected abstract toDomain(raw: any): TEntity;

  // ── Common Read Operations ──

  async findById(id: string): Promise<TEntity> {
    const record = await (this.delegate as any).findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`${this.entityName} with id ${id} not found`);
    }
    return this.toDomain(record);
  }

  async findByIdOrNull(id: string): Promise<TEntity | null> {
    const record = await (this.delegate as any).findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(
    page = 1,
    limit = 10,
    orderBy: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' },
  ): Promise<PaginatedResult<TEntity>> {
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      (this.delegate as any).findMany({ skip, take: limit, orderBy }),
      (this.delegate as any).count(),
    ]);

    return {
      data: records.map((r: any) => this.toDomain(r)),
      total,
      page,
      limit,
    };
  }

  async findMany(args?: {
    where?: any;
    orderBy?: any;
    skip?: number;
    take?: number;
    include?: any;
  }): Promise<TEntity[]> {
    const records = await (this.delegate as any).findMany(args);
    return records.map((r: any) => this.toDomain(r));
  }

  async findManyRaw(args?: any): Promise<any[]> {
    return (this.delegate as any).findMany(args);
  }

  async findUniqueRaw(args: any): Promise<any> {
    return (this.delegate as any).findUnique(args);
  }

  async count(where?: any): Promise<number> {
    return (this.delegate as any).count(where ? { where } : undefined);
  }

  // ── Common Write Operations ──

  async create(data: TCreate): Promise<TEntity> {
    const record = await (this.delegate as any).create({ data });
    return this.toDomain(record);
  }

  async createRaw(args: any): Promise<any> {
    return (this.delegate as any).create(args);
  }

  async createMany(data: TCreate[]): Promise<{ count: number }> {
    return (this.delegate as any).createMany({ data, skipDuplicates: true });
  }

  async update(id: string, data: TUpdate): Promise<TEntity> {
    const record = await (this.delegate as any).update({
      where: { id },
      data,
    });
    return this.toDomain(record);
  }

  async updateRaw(args: any): Promise<any> {
    return (this.delegate as any).update(args);
  }

  async upsert(args: { where: any; create: any; update: any }): Promise<TEntity> {
    const record = await (this.delegate as any).upsert(args);
    return this.toDomain(record);
  }

  async upsertRaw(args: { where: any; create: any; update: any }): Promise<any> {
    return (this.delegate as any).upsert(args);
  }

  async delete(id: string): Promise<void> {
    await (this.delegate as any).delete({ where: { id } });
  }

  async deleteMany(where: any): Promise<{ count: number }> {
    return (this.delegate as any).deleteMany({ where });
  }

  // ── Aggregation ──

  async groupBy(args: any): Promise<any[]> {
    return (this.delegate as any).groupBy(args);
  }
}
