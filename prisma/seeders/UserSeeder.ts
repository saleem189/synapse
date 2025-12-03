// ================================
// User Seeder
// ================================
// Seeds users table with default users

import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export class UserSeeder {
  /**
   * Run the seeder
   */
  static async run(): Promise<void> {
    console.log("👤 Seeding users...");

    const users = [
      {
        name: "Admin User",
        email: "admin@example.com",
        password: "Password123",
        role: UserRole.ADMIN,
        status: UserStatus.ONLINE,
      },
      {
        name: "John Doe",
        email: "john@example.com",
        password: "Password123",
        role: UserRole.USER,
        status: UserStatus.ONLINE,
      },
      {
        name: "Jane Smith",
        email: "jane@example.com",
        password: "Password123",
        role: UserRole.USER,
        status: UserStatus.AWAY,
      },
      {
        name: "Bob Wilson",
        email: "bob@example.com",
        password: "Password123",
        role: UserRole.USER,
        status: UserStatus.OFFLINE,
      },
      {
        name: "Alice Johnson",
        email: "alice@example.com",
        password: "Password123",
        role: UserRole.USER,
        status: UserStatus.ONLINE,
      },
    ];

    const createdUsers = [];

    for (const userData of users) {
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: await bcrypt.hash(userData.password, 12),
          role: userData.role,
          status: userData.status,
        },
      });

      createdUsers.push(user);
      console.log(`  ✅ Created: ${user.email} (${user.role})`);
    }

    console.log(`✅ Seeded ${createdUsers.length} users\n`);

    // Store created users for other seeders
    (UserSeeder as any).users = createdUsers;
  }

  /**
   * Get created users (for use in other seeders)
   */
  static getUsers() {
    return (UserSeeder as any).users || [];
  }
}

