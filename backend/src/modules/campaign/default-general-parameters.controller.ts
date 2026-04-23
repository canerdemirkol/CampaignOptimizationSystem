import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DefaultGeneralParametersService } from './default-general-parameters.service';
import { CreateGeneralParametersDto } from './dto/campaign.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('default-general-parameters')
@Controller('default-general-parameters')
export class DefaultGeneralParametersController {
  constructor(private readonly service: DefaultGeneralParametersService) {}

  @Get()
  @ApiOperation({ summary: 'Get default general parameters' })
  async get() {
    return this.service.get();
  }

  @Put()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Update default general parameters' })
  async update(@Body() dto: CreateGeneralParametersDto) {
    return this.service.update(dto);
  }
}
