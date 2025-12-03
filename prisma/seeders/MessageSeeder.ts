// ================================
// Message Seeder
// ================================
// Seeds messages for rooms

import { PrismaClient, MessageType } from "@prisma/client";
import { UserSeeder } from "./UserSeeder";
import { RoomSeeder } from "./RoomSeeder";

const prisma = new PrismaClient();

export class MessageSeeder {
  /**
   * Run the seeder
   */
  static async run(): Promise<void> {
    console.log("💭 Seeding messages...");

    const users = UserSeeder.getUsers();
    const rooms = RoomSeeder.getRooms();

    if (users.length === 0 || rooms.length === 0) {
      console.log("  ⚠️  No users or rooms found. Run UserSeeder and RoomSeeder first.\n");
      return;
    }

    const generalRoom = rooms.find((r: any) => r.name === "General Chat");
    if (generalRoom) {
      // Add welcome messages to general room
      const messages = [
        {
          content: "Welcome everyone! 👋",
          senderId: users[0].id,
          roomId: generalRoom.id,
          type: MessageType.TEXT,
        },
        {
          content: "Hey! Great to be here!",
          senderId: users[1].id,
          roomId: generalRoom.id,
          type: MessageType.TEXT,
        },
        {
          content: "Hello all! 🎉",
          senderId: users[2].id,
          roomId: generalRoom.id,
          type: MessageType.TEXT,
        },
        {
          content: "This is a test message with some content to see how it looks in the chat interface.",
          senderId: users[0].id,
          roomId: generalRoom.id,
          type: MessageType.TEXT,
        },
        {
          content: "Can someone help me with the project?",
          senderId: users[1].id,
          roomId: generalRoom.id,
          type: MessageType.TEXT,
        },
      ];

      await prisma.message.createMany({
        data: messages,
      });

      console.log(`  ✅ Created ${messages.length} messages in General Chat`);
    }

    // Add messages to DM if it exists
    const dmRoom = rooms.find((r: any) => !r.isGroup && r.participants.length === 2);
    if (dmRoom && users.length >= 2) {
      const dmMessages = [
        {
          content: "Hey! How are you?",
          senderId: users[1].id,
          roomId: dmRoom.id,
          type: MessageType.TEXT,
        },
        {
          content: "I'm doing great, thanks for asking! 😊",
          senderId: users[2].id,
          roomId: dmRoom.id,
          type: MessageType.TEXT,
        },
      ];

      await prisma.message.createMany({
        data: dmMessages,
      });

      console.log(`  ✅ Created ${dmMessages.length} messages in DM`);
    }

    console.log("✅ Messages seeded\n");
  }
}

