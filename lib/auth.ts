// ================================
// NextAuth.js Configuration
// ================================
// This file contains the authentication configuration using NextAuth.js
// with Credentials provider for email/password authentication

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

// Extend the default session and JWT types to include our custom fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
      role: string;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  }
}

export const authOptions: NextAuthOptions = {
  // Configure authentication providers
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validate that credentials were provided
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Find the user in the database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // Check if user exists
        if (!user) {
          throw new Error("No user found with this email");
        }

        // Verify the password
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        // Update user status to online
        await prisma.user.update({
          where: { id: user.id },
          data: { status: "online", lastSeen: new Date() },
        });

        // Return user object (password excluded)
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        };
      },
    }),
  ],

  // Configure session handling
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Configure JWT
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Custom pages for authentication
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },

  // Callbacks to customize session and JWT
  callbacks: {
    // Add custom properties to the JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.avatar = user.avatar;
        token.role = user.role;
      }
      return token;
    },

    // Add custom properties to the session
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          name: token.name,
          email: token.email,
          avatar: token.avatar,
          role: token.role,
        };
      }
      return session;
    },

    // Redirect based on role after login
    async redirect({ url, token }) {
      // If admin, always go to admin dashboard
      if (token?.role === "ADMIN") {
        return "/admin";
      }
      // If regular user, go to chat
      if (token) {
        return "/chat";
      }
      // Default redirect
      return url || "/";
    },
  },

  // Events for logging and side effects
  events: {
    async signOut({ token }) {
      // Update user status to offline when signing out
      if (token?.id) {
        await prisma.user.update({
          where: { id: token.id as string },
          data: { status: "offline", lastSeen: new Date() },
        });
      }
    },
  },

  // Enable debug mode in development
  debug: process.env.NODE_ENV === "development",
};

