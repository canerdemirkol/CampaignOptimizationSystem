import { Module } from '@nestjs/common';
import { IncomeLevelService } from './income-level.service';
import { IncomeLevelController } from './income-level.controller';

@Module({
  controllers: [IncomeLevelController],
  providers: [IncomeLevelService],
  exports: [IncomeLevelService],
})
export class IncomeLevelModule {}
