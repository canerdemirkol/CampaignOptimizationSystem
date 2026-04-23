import { Module } from '@nestjs/common';
import { CampaignCustomerSegmentScoreService } from './campaign-customer-segment-score.service';
import { CampaignCustomerSegmentScoreController } from './campaign-customer-segment-score.controller';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Module({
  controllers: [CampaignCustomerSegmentScoreController],
  providers: [CampaignCustomerSegmentScoreService, PrismaService],
  exports: [CampaignCustomerSegmentScoreService],
})
export class CampaignCustomerSegmentScoreModule {}
