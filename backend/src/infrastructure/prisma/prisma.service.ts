import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
  ) {
    const databaseUrl = configService.get<string>('DATABASE_URL') || '';
    const encryptionKey = configService.get<string>('ENCRYPTION_KEY') || '';

    // Decrypt DATABASE_URL if it's encrypted (ENC: prefix)
    const decryptedUrl = CryptoService.decryptEnvValue(databaseUrl, encryptionKey);

    super({
      datasources: {
        db: { url: decryptedUrl },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
