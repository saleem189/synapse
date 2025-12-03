// ================================
// Database Seeder (Main)
// ================================
// Runs all seeders in order - similar to Laravel's DatabaseSeeder

import { PrismaClient } from "@prisma/client";
import { UserSeeder } from "./UserSeeder";
import { ConfigSeeder } from "./ConfigSeeder";
import { RoomSeeder } from "./RoomSeeder";
import { MessageSeeder } from "./MessageSeeder";

const prisma = new PrismaClient();

export class DatabaseSeeder {
  /**
   * Run all seeders
   */
  static async run(): Promise<void> {
    console.log("🌱 Starting database seeding...\n");

    try {
      // Clear all data first (like Laravel's migrate:fresh)
      await this.truncateAll();

      // Run seeders in order
      await UserSeeder.run();
      await ConfigSeeder.run();
      await RoomSeeder.run();
      await MessageSeeder.run();

      console.log("\n✅ Database seeding completed successfully!");
    } catch (error) {
      console.error("❌ Error during seeding:", error);
      throw error;
    }
  }

  /**
   * Truncate all tables (like Laravel's migrate:fresh)
   * Note: In PostgreSQL, we use DELETE instead of TRUNCATE to respect foreign keys
   */
  private static async truncateAll(): Promise<void> {
    console.log("🧹 Clearing existing data...");

    // Delete in reverse order of dependencies
    await prisma.messageRead.deleteMany();
    await prisma.messageReaction.deleteMany();
    await prisma.message.deleteMany();
    await prisma.pushSubscription.deleteMany();
    await prisma.roomParticipant.deleteMany();
    await prisma.chatRoom.deleteMany();
    await prisma.user.deleteMany();
    await prisma.config.deleteMany();

    console.log("✅ All tables cleared\n");
  }
}

