import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

@Injectable()
export class FileLoggerService {
  private readonly baseDir: string;
  private minLevel: LogLevel = 'DEBUG';

  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'logs');
  }

  setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }

  debug(category: string, message: string, data?: Record<string, unknown>) {
    this.write(category, 'DEBUG', message, data);
  }

  info(category: string, message: string, data?: Record<string, unknown>) {
    this.write(category, 'INFO', message, data);
  }

  warning(category: string, message: string, data?: Record<string, unknown>) {
    this.write(category, 'WARNING', message, data);
  }

  error(category: string, message: string, data?: Record<string, unknown>) {
    this.write(category, 'ERROR', message, data);
  }

  private write(
    category: string,
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
  ) {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const logEntry: Record<string, unknown> = {
      '@timestamp': new Date().toISOString(),
      'log.level': level.toLowerCase(),
      message,
      'log.logger': category,
      'service.name': process.env.SERVICE_NAME || 'campaign-optimization-backend',
      'service.version': process.env.SERVICE_VERSION || '1.0.0',
    };

    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          logEntry[key] = value;
        }
      });
    }

    const line = JSON.stringify(logEntry) + '\n';
    const filePath = this.getFilePath(category);

    try {
      fs.appendFileSync(filePath, line, 'utf-8');
    } catch {
      // If write fails, try to create directory and retry
      try {
        const dir = path.dirname(filePath);
        fs.mkdirSync(dir, { recursive: true });
        fs.appendFileSync(filePath, line, 'utf-8');
      } catch (retryErr) {
        console.error('Failed to write log:', retryErr);
      }
    }
  }

  private getFilePath(category: string): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dir = path.join(this.baseDir, category);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Check base file size, if > 50MB create -2, -3, etc.
    let suffix = 1;
    let fileName = `${today}.log`;
    let filePath = path.join(dir, fileName);

    while (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size < MAX_FILE_SIZE) {
        return filePath;
      }
      suffix++;
      fileName = `${today}-${suffix}.log`;
      filePath = path.join(dir, fileName);
    }

    return filePath;
  }
}
