// ================================
// Room Seeder
// ================================
// Seeds chat rooms and participants

import { PrismaClient, UserRole } from "@prisma/client";
import { UserSeeder } from "./UserSeeder";

const prisma = new PrismaClient();

export class RoomSeeder {
  /**
   * Run the seeder
   */
  static async run(): Promise<void> {
    console.log("💬 Seeding rooms...");

    const users = UserSeeder.getUsers();
    if (users.length === 0) {
      console.log("  ⚠️  No users found. Run UserSeeder first.\n");
      return;
    }

    const adminUser = users.find((u: any) => u.role === UserRole.ADMIN) || users[0];
    const regularUsers = users.filter((u: any) => u.role === UserRole.USER);

    // Create a general group chat
    const generalRoom = await prisma.chatRoom.create({
      data: {
        name: "General Chat",
        description: "Welcome to the general chat room!",
        isGroup: true,
        ownerId: adminUser.id,
        participants: {
          create: users.map((user: any, index: number) => ({
            userId: user.id,
            role: index === 0 ? "admin" : "member",
          })),
        },
      },
    });
    console.log(`  ✅ Created: ${generalRoom.name} (${users.length} participants)`);

    // Create a private DM between first two users
    if (regularUsers.length >= 2) {
      const dmRoom = await prisma.chatRoom.create({
        data: {
          name: `${regularUsers[0].name} & ${regularUsers[1].name}`,
          isGroup: false,
          ownerId: regularUsers[0].id,
          participants: {
            create: [
              { userId: regularUsers[0].id, role: "member" },
              { userId: regularUsers[1].id, role: "member" },
            ],
          },
        },
      });
      console.log(`  ✅ Created: DM between ${regularUsers[0].name} and ${regularUsers[1].name}`);
    }

    // Create a project discussion group
    if (regularUsers.length >= 3) {
      const projectRoom = await prisma.chatRoom.create({
        data: {
          name: "Project Discussion",
          description: "Discussion about our current project",
          isGroup: true,
          ownerId: adminUser.id,
          participants: {
            create: [
              { userId: adminUser.id, role: "admin" },
              { userId: regularUsers[0].id, role: "member" },
              { userId: regularUsers[1].id, role: "member" },
              { userId: regularUsers[2].id, role: "member" },
            ],
          },
        },
      });
      console.log(`  ✅ Created: ${projectRoom.name} (4 participants)`);
    }

    console.log("✅ Rooms seeded\n");

    // Store created rooms for message seeder
    const rooms = await prisma.chatRoom.findMany({
      include: { participants: true },
    });
    (RoomSeeder as any).rooms = rooms;
  }

  /**
   * Get created rooms (for use in other seeders)
   */
  static getRooms() {
    return (RoomSeeder as any).rooms || [];
  }
}

