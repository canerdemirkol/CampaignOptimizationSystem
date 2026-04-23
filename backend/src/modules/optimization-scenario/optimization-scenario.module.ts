import { Module } from '@nestjs/common';
import { OptimizationScenarioController } from './optimization-scenario.controller';
import { OptimizationScenarioService } from './optimization-scenario.service';
import { CampaignRepository } from '../campaign/campaign.repository';

@Module({
  controllers: [OptimizationScenarioController],
  providers: [OptimizationScenarioService, CampaignRepository],
  exports: [OptimizationScenarioService],
})
export class OptimizationScenarioModule {}
