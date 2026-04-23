import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CustomerSegmentService } from './customer-segment.service';
import { CreateCustomerSegmentDto, UpdateCustomerSegmentDto } from './customer-segment.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('customer-segments')
@Controller('customer-segments')
export class CustomerSegmentController {
  constructor(private readonly service: CustomerSegmentService) {}

  @Get('all')
  @ApiOperation({ summary: 'Get all customer segments without pagination' })
  async getAll() {
    return this.service.findAll();
  }

  @Get()
  @ApiOperation({ summary: 'Get all customer segments with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.service.findAllPaginated(page, limit, search);
  }

  @Get('total-count')
  @ApiOperation({ summary: 'Get total customer count across all segments' })
  async getTotalCount() {
    const count = await this.service.getTotalCustomerCount();
    return { totalCustomerCount: count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer segment by id' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Create customer segment' })
  async create(@Body() dto: CreateCustomerSegmentDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Update customer segment' })
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerSegmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Delete customer segment' })
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { message: 'Customer segment deleted successfully' };
  }
}
