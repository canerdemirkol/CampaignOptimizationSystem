import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  CreateCampaignCustomerSegmentScoreDto,
  UpdateCampaignCustomerSegmentScoreDto,
} from './campaign-customer-segment-score.dto';

@Injectable()
export class CampaignCustomerSegmentScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(campaignId?: string) {
    const where = campaignId ? { campaignId } : undefined;
    return (this.prisma as any).campaignCustomerSegmentScore.findMany({
      where,
      include: { campaign: true, customerSegment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const score = await (this.prisma as any).campaignCustomerSegmentScore.findUnique({
      where: { id },
      include: { campaign: true, customerSegment: true },
    });
    if (!score) {
      throw new NotFoundException(
        `Campaign customer segment score with id ${id} not found`,
      );
    }
    return score;
  }

  async findByCompositeKey(campaignId: string, customerSegmentId: string) {
    return (this.prisma as any).campaignCustomerSegmentScore.findUnique({
      where: {
        campaignId_customerSegmentId: {
          campaignId,
          customerSegmentId,
        },
      },
      include: { campaign: true, customerSegment: true },
    });
  }

  async create(dto: CreateCampaignCustomerSegmentScoreDto) {
    // Check if campaign exists
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: dto.campaignId },
    });
    if (!campaign) {
      throw new BadRequestException(
        `Campaign with id ${dto.campaignId} not found`,
      );
    }

    // Check if customer segment exists
    const segment = await this.prisma.customerSegment.findUnique({
      where: { id: dto.customerSegmentId },
    });
    if (!segment) {
      throw new BadRequestException(
        `Customer segment with id ${dto.customerSegmentId} not found`,
      );
    }

    // Check if combination already exists
    const existing = await this.findByCompositeKey(
      dto.campaignId,
      dto.customerSegmentId,
    );
    if (existing) {
      throw new BadRequestException(
        `Score already exists for campaign ${dto.campaignId} and segment ${dto.customerSegmentId}`,
      );
    }

    return (this.prisma as any).campaignCustomerSegmentScore.create({
      data: {
        campaignId: dto.campaignId,
        customerSegmentId: dto.customerSegmentId,
        score: dto.score,
      },
      include: { campaign: true, customerSegment: true },
    });
  }

  async update(id: string, dto: UpdateCampaignCustomerSegmentScoreDto) {
    await this.findById(id); // Verify exists
    return (this.prisma as any).campaignCustomerSegmentScore.update({
      where: { id },
      data: { score: dto.score },
      include: { campaign: true, customerSegment: true },
    });
  }

  async delete(id: string) {
    await this.findById(id); // Verify exists
    await (this.prisma as any).campaignCustomerSegmentScore.delete({
      where: { id },
    });
  }

  async upsert(
    campaignId: string,
    customerSegmentId: string,
    score: number,
  ) {
    return (this.prisma as any).campaignCustomerSegmentScore.upsert({
      where: {
        campaignId_customerSegmentId: {
          campaignId,
          customerSegmentId,
        },
      },
      update: { score },
      create: {
        campaignId,
        customerSegmentId,
        score,
      },
      include: { campaign: true, customerSegment: true },
    });
  }

  async getScoresForCampaign(campaignId: string, page = 1, limit = 10) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign with id ${campaignId} not found`);
    }

    const skip = (page - 1) * limit;
    const where = { campaignId };

    const [data, total] = await Promise.all([
      (this.prisma as any).campaignCustomerSegmentScore.findMany({
        where,
        include: { customerSegment: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).campaignCustomerSegmentScore.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getScoresForSegment(customerSegmentId: string) {
    const segment = await this.prisma.customerSegment.findUnique({
      where: { id: customerSegmentId },
    });
    if (!segment) {
      throw new NotFoundException(
        `Customer segment with id ${customerSegmentId} not found`,
      );
    }

    return (this.prisma as any).campaignCustomerSegmentScore.findMany({
      where: { customerSegmentId },
      include: { campaign: true },
    });
  }
}
