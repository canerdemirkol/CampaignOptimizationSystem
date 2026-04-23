import { Module } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { CampaignRepository } from './campaign.repository';
import { DefaultGeneralParametersService } from './default-general-parameters.service';
import { DefaultGeneralParametersController } from './default-general-parameters.controller';

@Module({
  controllers: [CampaignController, DefaultGeneralParametersController],
  providers: [CampaignRepository, CampaignService, DefaultGeneralParametersService],
  exports: [CampaignService, CampaignRepository, DefaultGeneralParametersService],
})
export class CampaignModule {}
