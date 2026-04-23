import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { CustomerModule } from './modules/customer/customer.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { OptimizationModule } from './modules/optimization/optimization.module';
import { OptimizationScenarioModule } from './modules/optimization-scenario/optimization-scenario.module';
import { CustomerSegmentModule } from './modules/customer-segment/customer-segment.module';
import { CampaignCustomerSegmentScoreModule } from './modules/campaign-customer-segment-score/campaign-customer-segment-score.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { CryptoModule } from './infrastructure/crypto/crypto.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { HealthModule } from './modules/health/health.module';
import { IncomeLevelModule } from './modules/income-level/income-level.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    LoggerModule,
    PrismaModule,
    CryptoModule,
    AuthModule,
    UserModule,
    CustomerModule,
    CampaignModule,
    OptimizationModule,
    OptimizationScenarioModule,
    CustomerSegmentModule,
    CampaignCustomerSegmentScoreModule,
    IncomeLevelModule,
    HealthModule,
  ],
})
export class AppModule {}
