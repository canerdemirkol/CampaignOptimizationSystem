import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IncomeLevelService } from './income-level.service';

@ApiTags('income-levels')
@Controller('income-levels')
export class IncomeLevelController {
  constructor(private readonly service: IncomeLevelService) {}

  @Get()
  @ApiOperation({ summary: 'Get all income levels' })
  async findAll() {
    return this.service.findAll();
  }
}
