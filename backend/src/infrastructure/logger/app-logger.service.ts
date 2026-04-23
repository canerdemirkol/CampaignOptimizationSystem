import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { FileLoggerService } from './file-logger.service';

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private context = 'Application';
  private fileLogEnabled = false;

  constructor(private readonly fileLogger: FileLoggerService) {
    this.fileLogEnabled =
      (process.env.FILE_LOG_ENABLED || 'false').toLowerCase() === 'true';
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    const ctx = context || this.context;
    this.writeEcs('info', message, { 'log.logger': ctx });
    if (this.fileLogEnabled) {
      this.fileLogger.info('general', message, { context: ctx });
    }
  }

  error(message: string, trace?: string, context?: string) {
    const ctx = context || this.context;
    const extra: Record<string, unknown> = { 'log.logger': ctx };
    if (trace) {
      extra['error.stack_trace'] = trace;
    }
    this.writeEcs('error', message, extra);
    if (this.fileLogEnabled) {
      this.fileLogger.error('general', message, {
        context: ctx,
        'error.stack_trace': trace || undefined,
      });
    }
  }

  warn(message: string, context?: string) {
    const ctx = context || this.context;
    this.writeEcs('warn', message, { 'log.logger': ctx });
    if (this.fileLogEnabled) {
      this.fileLogger.warning('general', message, { context: ctx });
    }
  }

  debug(message: string, context?: string) {
    const ctx = context || this.context;
    this.writeEcs('debug', message, { 'log.logger': ctx });
    if (this.fileLogEnabled) {
      this.fileLogger.debug('general', message, { context: ctx });
    }
  }

  verbose(message: string, context?: string) {
    const ctx = context || this.context;
    this.writeEcs('debug', message, { 'log.logger': ctx });
    if (this.fileLogEnabled) {
      this.fileLogger.debug('general', message, { context: ctx });
    }
  }

  /**
   * Log HTTP client request/response to httpclient category
   */
  logHttpRequest(data: {
    method: string;
    url: string;
    requestBody?: unknown;
    responseStatus?: number;
    responseBody?: unknown;
    duration?: number;
    error?: string;
    traceId?: string;
  }) {
    const ecsData: Record<string, unknown> = {
      'log.logger': 'httpclient',
      'http.request.method': data.method,
      'url.path': data.url,
    };
    if (data.traceId) {
      ecsData['trace.id'] = data.traceId;
    }
    if (data.responseStatus !== undefined) {
      ecsData['http.response.status_code'] = data.responseStatus;
    }
    if (data.duration !== undefined) {
      ecsData['event.duration'] = data.duration * 1_000_000; // ms to nanoseconds (ECS standard)
    }
    if (data.requestBody !== undefined) {
      ecsData['http.request.body.content'] = data.requestBody;
    }
    if (data.responseBody !== undefined) {
      ecsData['http.response.body.content'] = data.responseBody;
    }
    if (data.error) {
      ecsData['error.message'] = data.error;
    }

    this.writeEcs('info', `${data.method} ${data.url}`, ecsData);

    if (this.fileLogEnabled) {
      this.fileLogger.info('httpclient', `${data.method} ${data.url}`, {
        'trace.id': data.traceId,
        'http.request.method': data.method,
        'url.path': data.url,
        'http.request.body.content': data.requestBody as Record<string, unknown> | undefined,
        'http.response.status_code': data.responseStatus,
        'http.response.body.content': data.responseBody as Record<string, unknown> | undefined,
        'event.duration': data.duration ? data.duration * 1_000_000 : undefined,
        'error.message': data.error,
      });
    }
  }

  logHttpError(data: {
    method: string;
    url: string;
    requestBody?: unknown;
    error: string;
    duration?: number;
    traceId?: string;
  }) {
    const ecsData: Record<string, unknown> = {
      'log.logger': 'httpclient',
      'http.request.method': data.method,
      'url.path': data.url,
      'error.message': data.error,
    };
    if (data.traceId) {
      ecsData['trace.id'] = data.traceId;
    }
    if (data.duration !== undefined) {
      ecsData['event.duration'] = data.duration * 1_000_000;
    }
    if (data.requestBody !== undefined) {
      ecsData['http.request.body.content'] = data.requestBody;
    }

    this.writeEcs('error', `${data.method} ${data.url} FAILED`, ecsData);

    if (this.fileLogEnabled) {
      this.fileLogger.error('httpclient', `${data.method} ${data.url} FAILED`, {
        'trace.id': data.traceId,
        'http.request.method': data.method,
        'url.path': data.url,
        'http.request.body.content': data.requestBody as Record<string, unknown> | undefined,
        'error.message': data.error,
        'event.duration': data.duration ? data.duration * 1_000_000 : undefined,
      });
    }
  }

  private writeEcs(
    level: string,
    message: string,
    extra?: Record<string, unknown>,
  ) {
    const entry: Record<string, unknown> = {
      '@timestamp': new Date().toISOString(),
      'log.level': level,
      message,
      'service.name':
        process.env.SERVICE_NAME || 'campaign-optimization-backend',
      'service.version': process.env.SERVICE_VERSION || '1.0.0',
    };

    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        if (value !== undefined) {
          entry[key] = value;
        }
      });
    }

    const line = JSON.stringify(entry);

    switch (level) {
      case 'error':
        process.stderr.write(line + '\n');
        break;
      default:
        process.stdout.write(line + '\n');
        break;
    }
  }
}
