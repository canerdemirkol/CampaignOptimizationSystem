import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { BaseRepository } from '../../infrastructure/repositories';
import { Campaign, CampaignTypeEnum } from '../../domain/entities/campaign.entity';

@Injectable()
export class CampaignRepository extends BaseRepository<Campaign> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Campaign');
  }

  protected getDelegate() {
    return this.prisma.campaign;
  }

  protected toDomain(data: any): Campaign {
    return new Campaign({
      id: data.id,
      name: data.name,
      type: (data.type as CampaignTypeEnum) || CampaignTypeEnum.CRM,
      rMin: data.rMin ?? 100,
      rMax: data.rMax ?? 5000,
      zK: data.zK ?? 500,
      cK: data.cK ?? 50,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async findByIdWithDetails(id: string) {
    return this.findUniqueRaw({
      where: { id },
      include: {
        optimizationSummary: true,
        optimizationDetails: true,
      },
    });
  }

  async findByIdWithParameters(id: string) {
    return this.findUniqueRaw({
      where: { id },
    });
  }

  async findAllWithSearch(
    page = 1,
    limit = 10,
    search?: string,
    type?: string,
    orderBy: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (type) {
      where.type = type.toUpperCase();
    }

    const [records, total] = await Promise.all([
      this.prisma.campaign.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      data: records.map((r: any) => this.toDomain(r)),
      total,
      page,
      limit,
    };
  }
}
