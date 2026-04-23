import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { CustomerRepository } from './customer.repository';

@Module({
  controllers: [CustomerController],
  providers: [CustomerRepository, CustomerService],
  exports: [CustomerService, CustomerRepository],
})
export class CustomerModule {}
