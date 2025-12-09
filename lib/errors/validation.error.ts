// ================================
// Validation Error
// ================================
// Thrown when input validation fails

import { AppError } from './base.error';

export class ValidationError extends AppError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';

  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, details);
  }
}

