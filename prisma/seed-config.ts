// prisma/seeders/config.ts
import { PrismaClient } from '@prisma/client';
import { config as envConfig } from 'dotenv';
envConfig();

const prisma = new PrismaClient();

export async function seed() {
    const configs = [
        { key: 'push.vapid.publicKey', value: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '' },
        { key: 'push.vapid.privateKey', value: process.env.VAPID_PRIVATE_KEY || '' },
        { key: 'email.from', value: process.env.EMAIL_FROM || '' },
    ];

    for (const c of configs) {
        if (!c.value) continue;
        await prisma.config.upsert({
            where: { key: c.key },
            update: { value: c.value, updatedAt: new Date() },
            create: { key: c.key, value: c.value },
        });
    }
    console.log('✅ Config seeded');
}
