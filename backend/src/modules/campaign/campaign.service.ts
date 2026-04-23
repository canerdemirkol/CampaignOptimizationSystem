import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CampaignRepository } from './campaign.repository';
import { Campaign, CampaignTypeEnum } from '../../domain/entities/campaign.entity';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignTypeDto,
  CreateGeneralParametersDto,
  UpdateGeneralParametersDto,
  CreateCampaignParametersDto,
  UpdateCampaignParametersDto,
} from './dto/campaign.dto';

@Injectable()
export class CampaignService {
  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(page = 1, limit = 10, search?: string, type?: string) {
    return this.campaignRepo.findAllWithSearch(page, limit, search, type);
  }

  async getAll(): Promise<Campaign[]> {
    return this.campaignRepo.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string): Promise<Campaign> {
    return this.campaignRepo.findById(id);
  }

  async findByIdWithDetails(id: string) {
    const campaign = await this.campaignRepo.findByIdWithDetails(id);
    if (!campaign) {
      throw new NotFoundException(`Campaign with id ${id} not found`);
    }
    return campaign;
  }

  async create(dto: CreateCampaignDto): Promise<Campaign> {
    const campaign = await this.campaignRepo.create({
      name: dto.name,
      type: (dto.type as unknown as CampaignTypeEnum) || CampaignTypeEnum.CRM,
      rMin: dto.rMin ?? 100,
      rMax: dto.rMax ?? 5000,
      zK: dto.zK ?? 500,
      cK: dto.cK ?? 50,
    });
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.campaignRepo.findById(id);

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.type !== undefined) updateData.type = dto.type as unknown as CampaignTypeEnum;
    if (dto.rMin !== undefined) updateData.rMin = dto.rMin;
    if (dto.rMax !== undefined) updateData.rMax = dto.rMax;
    if (dto.zK !== undefined) updateData.zK = dto.zK;
    if (dto.cK !== undefined) updateData.cK = dto.cK;
    return this.campaignRepo.update(id, updateData);
  }

  async delete(id: string): Promise<void> {
    await this.campaignRepo.findById(id);
    await this.campaignRepo.delete(id);
  }


  // ── DEFAULT GENERAL PARAMETERS ──
  async getDefaultGeneralParameters() {
    const defaults = await this.prisma.defaultGeneralParameters.findFirst();
    if (!defaults) {
      throw new NotFoundException('Default general parameters not found in database');
    }
    return {
      cMin: defaults.cMin,
      cMax: defaults.cMax,
      nMin: defaults.nMin,
      nMax: defaults.nMax,
      bMin: defaults.bMin,
      bMax: defaults.bMax,
      mMin: defaults.mMin,
      mMax: defaults.mMax,
    };
  }
}
