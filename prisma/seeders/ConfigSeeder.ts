// ================================
// Config Seeder
// ================================
// Seeds configs table from environment variables

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class ConfigSeeder {
  /**
   * Run the seeder
   */
  static async run(): Promise<void> {
    console.log("⚙️  Seeding configs...");

    const configs = [
      {
        key: "push.vapid.publicKey",
        value: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      },
      {
        key: "push.vapid.privateKey",
        value: process.env.VAPID_PRIVATE_KEY,
      },
      {
        key: "push.vapid.subject",
        value: process.env.NEXT_PUBLIC_VAPID_SUBJECT,
      },
      {
        key: "email.from",
        value: process.env.EMAIL_FROM || "noreply@example.com",
      },
      {
        key: "email.provider",
        value: process.env.EMAIL_PROVIDER || "smtp",
      },
      {
        key: "app.name",
        value: process.env.NEXT_PUBLIC_APP_NAME || "ChatFlow",
      },
    ];

    let seededCount = 0;

    for (const config of configs) {
      // Skip if value is not provided (except for defaults)
      if (!config.value && !config.key.includes("email.from") && !config.key.includes("app.name")) {
        console.log(`  ⚠️  Skipped: ${config.key} (no value provided)`);
        continue;
      }

      await prisma.config.upsert({
        where: { key: config.key },
        update: {
          value: config.value,
          updatedAt: new Date(),
        },
        create: {
          key: config.key,
          value: config.value,
        },
      });

      console.log(`  ✅ Set: ${config.key}`);
      seededCount++;
    }

    console.log(`✅ Seeded ${seededCount} configs\n`);
  }
}

