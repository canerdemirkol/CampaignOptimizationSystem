import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class IncomeLevelService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.incomeLevel.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
