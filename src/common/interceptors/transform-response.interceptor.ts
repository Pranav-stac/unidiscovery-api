import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          (data as { success: boolean }).success === true
        ) {
          return data as unknown as ApiSuccessResponse<T>;
        }

        return {
          success: true,
          data,
        };
      }),
    );
  }
}
