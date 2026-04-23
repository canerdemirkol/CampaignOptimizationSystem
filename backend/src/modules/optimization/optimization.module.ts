import { Module } from '@nestjs/common';
import { OptimizationService } from './optimization.service';
import { OptimizationController } from './optimization.controller';
import { OptimizationRepository } from './optimization.repository';
import { CampaignModule } from '../campaign/campaign.module';
import { CustomerModule } from '../customer/customer.module';
import { CustomerSegmentModule } from '../customer-segment/customer-segment.module';

@Module({
  imports: [CampaignModule, CustomerModule, CustomerSegmentModule],
  controllers: [OptimizationController],
  providers: [OptimizationRepository, OptimizationService],
  exports: [OptimizationService],
})
export class OptimizationModule {}
