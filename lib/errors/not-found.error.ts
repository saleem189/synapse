// ================================
// Not Found Error
// ================================
// Thrown when a requested resource is not found

import { AppError } from './base.error';

export class NotFoundError extends AppError {
  statusCode = 404;
  code = 'NOT_FOUND';

  constructor(message: string = 'Resource not found', details?: unknown) {
    super(message, details);
  }
}

