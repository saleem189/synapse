// ================================
// Request Validation Middleware
// ================================
// Validates request bodies using Zod schemas

import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";

/**
 * Validates request body against a Zod schema
 * Returns validated data or error response
 * 
 * Also enforces request body size limits (DoS protection)
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
  options?: { maxBodySize?: number } // Max body size in bytes (default: 1MB)
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    // Check Content-Length header for early rejection of large requests
    const contentLength = request.headers.get('content-length');
    const maxBodySize = options?.maxBodySize || 1 * 1024 * 1024; // Default: 1MB
    
    if (contentLength) {
      const bodySize = parseInt(contentLength, 10);
      if (bodySize > maxBodySize) {
        return {
          success: false,
          response: NextResponse.json(
            {
              error: "Request too large",
              message: `Request body size (${(bodySize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxBodySize / 1024 / 1024).toFixed(2)}MB)`,
            },
            { status: 413 } // 413 Payload Too Large
          ),
        };
      }
    }

    const body = await request.json();
    
    // Double-check actual body size after parsing (Content-Length might be missing)
    const bodySize = JSON.stringify(body).length;
    if (bodySize > maxBodySize) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: "Request too large",
            message: `Request body size (${(bodySize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxBodySize / 1024 / 1024).toFixed(2)}MB)`,
          },
          { status: 413 } // 413 Payload Too Large
        ),
      };
    }
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: "Validation failed",
            details: result.error.errors.map((err) => ({
              path: err.path.join("."),
              message: err.message,
            })),
          },
          { status: 400 }
        ),
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: "Invalid JSON",
            message: "Request body must be valid JSON",
          },
          { status: 400 }
        ),
      };
    }

    // Handle other errors
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Validation error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Higher-order function to create a validation middleware
 * Usage: const validated = await validateRequest(request, messageSchema);
 */
export function createValidationMiddleware<T>(schema: ZodSchema<T>) {
  return async (request: NextRequest) => {
    return validateRequest(request, schema);
  };
}

