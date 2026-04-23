import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe, Res, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { CustomerService } from './customer.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerResponseDto } from './dto/customer.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get('all')
  @ApiOperation({ summary: 'Get all customers without pagination' })
  async getAll() {
    return this.customerService.getAll();
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.customerService.findAll(page, limit);
  }

  @Get('template')
  @ApiOperation({ summary: 'Download customer import Excel template' })
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.customerService.generateTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=customer_template.xlsx',
    });
    res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by id' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  async findById(@Param('id') id: string) {
    return this.customerService.findById(id);
  }

  @Get('by-customer-no/:customerNo')
  @ApiOperation({ summary: 'Get customer by customer number' })
  async findByCustomerNo(@Param('customerNo') customerNo: string) {
    return this.customerService.findByCustomerNo(customerNo);
  }

  @Post()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, type: CustomerResponseDto })
  async create(@Body() dto: CreateCustomerDto) {
    return this.customerService.create(dto);
  }

  @Post('bulk-import')
  @Roles('ADMIN', 'USER')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk import customers from Excel file' })
  async bulkImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { message: 'No file uploaded' };
    }
    return this.customerService.bulkImportFromExcel(file.buffer);
  }

  @Put(':id')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customerService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a customer (Admin only)' })
  async delete(@Param('id') id: string) {
    await this.customerService.delete(id);
    return { message: 'Customer deleted successfully' };
  }
}
