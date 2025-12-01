// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config as envConfig } from "dotenv";

envConfig(); // Load env variables

const prisma = new PrismaClient();

// ------------------ USERS & ROOMS ------------------
const users = [
  { name: "Admin User", email: "admin@example.com", password: "Password123", role: "admin" },
  { name: "John Doe", email: "john@example.com", password: "Password123", role: "user" },
  { name: "Jane Smith", email: "jane@example.com", password: "Password123", role: "user" },
  { name: "Bob Wilson", email: "bob@example.com", password: "Password123", role: "user" },
  { name: "Alice Johnson", email: "alice@example.com", password: "Password123", role: "user" },
];

async function seedUsersAndRooms() {
  console.log("🌱 Seeding users and chat room...");

  await prisma.message.deleteMany();
  await prisma.roomParticipant.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.user.deleteMany();

  const createdUsers = [];
  for (const u of users) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password: await bcrypt.hash(u.password, 12),
        role: u.role,
        status: "offline",
      },
    });
    createdUsers.push(user);
    console.log(`✅ Created: ${user.email} (${u.role})`);
  }

  const group = await prisma.chatRoom.create({
    data: {
      name: "General Chat",
      isGroup: true,
      ownerId: createdUsers[0].id,
      participants: {
        create: createdUsers.map((u, i) => ({
          userId: u.id,
          role: i === 0 ? "admin" : "member",
        })),
      },
    },
  });
  console.log(`✅ Created room: ${group.name}`);

  await prisma.message.createMany({
    data: [
      { content: "Welcome everyone! 👋", senderId: createdUsers[0].id, roomId: group.id },
      { content: "Hey! Great to be here!", senderId: createdUsers[1].id, roomId: group.id },
      { content: "Hello all! 🎉", senderId: createdUsers[2].id, roomId: group.id },
    ],
  });

  return createdUsers;
}

// ------------------ CONFIG ------------------
async function seedConfig() {
  console.log("🌱 Seeding configs from environment variables...");

  const configs = [
    { key: "push.vapid.publicKey", value: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY },
    { key: "push.vapid.privateKey", value: process.env.VAPID_PRIVATE_KEY },
    { key: "email.from", value: process.env.EMAIL_FROM },
    { key: "app.name", value: process.env.NEXT_PUBLIC_APP_NAME },
  ];

  for (const c of configs) {
    if (!c.value) continue;

    await prisma.config.upsert({
      where: { key: c.key },
      update: { value: c.value, updatedAt: new Date() },
      create: { key: c.key, value: c.value },
    });

    console.log(`✅ Config set: ${c.key}`);
  }
}

// ------------------ MAIN ------------------
async function main() {
  const createdUsers = await seedUsersAndRooms();
  await seedConfig();

  console.log("\n🎉 Seeding complete! Users and configs are ready.");
  console.log("Admin login:", createdUsers.find(u => u.role === "admin")?.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
