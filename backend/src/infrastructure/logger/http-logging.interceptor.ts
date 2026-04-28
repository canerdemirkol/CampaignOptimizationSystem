import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request, Response } from 'express';
import { AppLoggerService } from './app-logger.service';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<Request>();
    const response = httpCtx.getResponse<Response>();

    const { method, originalUrl, body, headers } = request;
    const startTime = Date.now();

    // Extract or generate trace ID for distributed tracing
    const traceId =
      (headers['x-correlation-id'] as string) ||
      `gen-${Date.now()}`;

    // Set trace ID on response header for downstream services
    response.setHeader('X-Correlation-ID', traceId);

    // Skip serializing the body for large requests. The body-parser limit
    // is 50 MB to accommodate the Python optimizer's decision_variables
    // callback; running JSON.stringify on a 36 MB body and writing it
    // synchronously to stdout was saturating the log pipeline badly
    // enough that unrelated requests (auth/login) started returning
    // HTTP 500.
    const contentLength = Number(headers['content-length'] || 0);
    const sanitizedBody =
      contentLength > 100_000
        ? { _truncated: true, _contentLength: contentLength }
        : this.sanitizeBody(body);

    return next.handle().pipe(
      tap((responseBody) => {
        try {
          const duration = Date.now() - startTime;
          this.logger.logHttpRequest({
            method,
            url: originalUrl,
            requestBody: sanitizedBody,
            responseStatus: response.statusCode,
            responseBody: this.truncateResponse(responseBody),
            duration,
            traceId,
          });
        } catch {
          // Logging must never fail a request — swallow.
        }
      }),
      catchError((error) => {
        try {
          const duration = Date.now() - startTime;
          this.logger.logHttpError({
            method,
            url: originalUrl,
            requestBody: sanitizedBody,
            error: error.message || String(error),
            duration,
            traceId,
          });
        } catch {
          // Logging must never fail a request — swallow.
        }
        return throwError(() => error);
      }),
    );
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;

    const sensitiveKeys = ['password', 'token', 'secret', 'authorization'];
    const sanitized = { ...(body as Record<string, unknown>) };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  private truncateResponse(body: unknown): unknown {
    if (!body) return body;
    const str = JSON.stringify(body);
    if (str.length > 5000) {
      return { _truncated: true, _length: str.length };
    }
    return body;
  }
}
