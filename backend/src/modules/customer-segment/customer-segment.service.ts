import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateCustomerSegmentDto, UpdateCustomerSegmentDto } from './customer-segment.dto';

const SEGMENT_NAME_PATTERN = /^Segment (\d+)$/;

// Extracts numeric id from "Segment {N}" names; unmatched names sort to the end.
function parseSegmentId(name: string): number {
  const match = name.match(SEGMENT_NAME_PATTERN);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

@Injectable()
export class CustomerSegmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const segments = await this.prisma.customerSegment.findMany({
      include: { incomeLevel: true },
    });
    // Sort by numeric segment id parsed from "Segment {id}" naming to avoid
    // lexicographic order (which would place "Segment 10" before "Segment 2").
    return segments.sort((a, b) => parseSegmentId(a.name) - parseSegmentId(b.name));
  }

  async findAllPaginated(page = 1, limit = 10, search?: string) {
    const where: any = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    // Sort by numeric segment id ("Segment {N}") requires fetching then slicing,
    // because the order depends on a parsed number rather than a column.
    const [all, total] = await Promise.all([
      this.prisma.customerSegment.findMany({
        where,
        include: { incomeLevel: true },
      }),
      this.prisma.customerSegment.count({ where }),
    ]);

    const sorted = all.sort(
      (a, b) => parseSegmentId(a.name) - parseSegmentId(b.name),
    );
    const skip = (page - 1) * limit;
    const data = sorted.slice(skip, skip + limit);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const segment = await this.prisma.customerSegment.findUnique({
      where: { id },
      include: { incomeLevel: true },
    });
    if (!segment) {
      throw new NotFoundException(`Customer segment with id ${id} not found`);
    }
    return segment;
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

  async create(dto: CreateCustomerSegmentDto) {
    const existing = await this.prisma.customerSegment.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException(`Customer segment with name "${dto.name}" already exists`);
    }
    const incomeLevelId = await this.resolveIncomeLevelId(dto.incomeLevel);
    return this.prisma.customerSegment.create({
      data: {
        name: dto.name,
        description: dto.description,
        customerCount: dto.customerCount,
        lifetimeValue: dto.lifetimeValue,
        ...(incomeLevelId && { incomeLevelId }),
      },
      include: { incomeLevel: true },
    });
  }

  async update(id: string, dto: UpdateCustomerSegmentDto) {
    await this.findById(id);
    const incomeLevelId = await this.resolveIncomeLevelId(dto.incomeLevel);
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.customerCount !== undefined) updateData.customerCount = dto.customerCount;
    if (dto.lifetimeValue !== undefined) updateData.lifetimeValue = dto.lifetimeValue;
    if (incomeLevelId !== undefined) updateData.incomeLevelId = incomeLevelId;

    return this.prisma.customerSegment.update({
      where: { id },
      data: updateData,
      include: { incomeLevel: true },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.customerSegment.delete({ where: { id } });
  }

  async getTotalCustomerCount(): Promise<number> {
    const result = await this.prisma.customerSegment.aggregate({
      _sum: { customerCount: true },
    });
    return result._sum.customerCount || 0;
  }
}
