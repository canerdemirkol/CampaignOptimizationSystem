import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CampaignCustomerSegmentScoreService } from './campaign-customer-segment-score.service';
import {
  CreateCampaignCustomerSegmentScoreDto,
  UpdateCampaignCustomerSegmentScoreDto,
} from './campaign-customer-segment-score.dto';

@ApiTags('Campaign Customer Segment Scores')
@Controller('campaign-segment-scores')
export class CampaignCustomerSegmentScoreController {
  constructor(
    private readonly service: CampaignCustomerSegmentScoreService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all campaign customer segment scores' })
  findAll(@Query('campaignId') campaignId?: string) {
    return this.service.findAll(campaignId);
  }

  @Get('campaign/:campaignId')
  @ApiOperation({
    summary: 'Get paginated scores for a specific campaign',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getScoresForCampaign(
    @Param('campaignId') campaignId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.service.getScoresForCampaign(campaignId, page, limit);
  }

  @Get('segment/:segmentId')
  @ApiOperation({
    summary: 'Get all scores for a specific customer segment',
  })
  getScoresForSegment(@Param('segmentId') customerSegmentId: string) {
    return this.service.getScoresForSegment(customerSegmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign customer segment score by ID' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new campaign customer segment score',
  })
  create(@Body() dto: CreateCampaignCustomerSegmentScoreDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update campaign customer segment score',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignCustomerSegmentScoreDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete campaign customer segment score',
  })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
