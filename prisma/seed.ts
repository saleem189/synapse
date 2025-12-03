// ================================
// Main Seed File
// ================================
// Entry point for seeding - runs DatabaseSeeder

import { PrismaClient } from "@prisma/client";
import { config as envConfig } from "dotenv";
import { DatabaseSeeder } from "./seeders/DatabaseSeeder";

envConfig(); // Load env variables

const prisma = new PrismaClient();

async function main() {
  try {
    await DatabaseSeeder.run();

    console.log("\n🎉 All seeders completed successfully!");
    console.log("\n📝 Login credentials:");
    console.log("   Admin: admin@example.com / Password123");
    console.log("   User:  john@example.com / Password123");
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
