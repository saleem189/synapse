// ================================
// Unauthorized Error
// ================================
// Thrown when user is not authenticated

import { AppError } from './base.error';

export class UnauthorizedError extends AppError {
  statusCode = 401;
  code = 'UNAUTHORIZED';

  constructor(message: string = 'Unauthorized', details?: unknown) {
    super(message, details);
  }
}

