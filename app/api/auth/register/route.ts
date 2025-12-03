// ================================
// User Registration API Route
// ================================
// POST /api/auth/register
// Creates a new user account with hashed password

import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { UserService } from "@/lib/services/user.service";
import { registerSchema } from "@/lib/validations";
import { validateRequest } from "@/lib/middleware/validate-request";

// Get services from DI container
const userService = getService<UserService>('userService');

export async function POST(request: NextRequest) {
  try {
    // Validate request body using middleware
    const validation = await validateRequest(request, registerSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { name, email, password } = validation.data;

    // Register user via service
    const user = await userService.register(name, email, password);

    return NextResponse.json(
      {
        message: "User created successfully",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

