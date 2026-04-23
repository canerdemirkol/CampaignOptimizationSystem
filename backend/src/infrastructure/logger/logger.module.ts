import { Global, Module } from '@nestjs/common';
import { FileLoggerService } from './file-logger.service';
import { AppLoggerService } from './app-logger.service';

@Global()
@Module({
  providers: [FileLoggerService, AppLoggerService],
  exports: [AppLoggerService, FileLoggerService],
})
export class LoggerModule {}
