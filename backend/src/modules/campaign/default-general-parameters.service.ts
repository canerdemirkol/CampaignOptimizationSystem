import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateGeneralParametersDto } from './dto/campaign.dto';

@Injectable()
export class DefaultGeneralParametersService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    let defaults = await this.prisma.defaultGeneralParameters.findFirst();
    if (!defaults) {
      defaults = await this.prisma.defaultGeneralParameters.create({ data: {} });
    }
    return defaults;
  }

  async update(dto: CreateGeneralParametersDto) {
    let defaults = await this.prisma.defaultGeneralParameters.findFirst();
    if (!defaults) {
      return this.prisma.defaultGeneralParameters.create({
        data: {
          cMin: dto.cMin, cMax: dto.cMax,
          nMin: dto.nMin, nMax: dto.nMax,
          bMin: dto.bMin, bMax: dto.bMax,
          mMin: dto.mMin, mMax: dto.mMax,
        },
      });
    }
    return this.prisma.defaultGeneralParameters.update({
      where: { id: defaults.id },
      data: {
        cMin: dto.cMin, cMax: dto.cMax,
        nMin: dto.nMin, nMax: dto.nMax,
        bMin: dto.bMin, bMax: dto.bMax,
        mMin: dto.mMin, mMax: dto.mMax,
      },
    });
  }
}
