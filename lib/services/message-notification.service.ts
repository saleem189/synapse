// ================================
// Message Notification Service
// ================================
// Handles push notifications for messages

import { RoomRepository } from '@/lib/repositories/room.repository';
import { QueueService } from '@/lib/queue/queue-service';
import { PushService } from '@/lib/services/push.service';
import { logger } from '@/lib/logger';

export class MessageNotificationService {
  constructor(
    private roomRepo: RoomRepository,
    private queueService: QueueService,
    private pushService?: PushService // Optional - fallback only
  ) {}

  /**
   * Send push notifications to offline/inactive participants
   */
  async sendPushNotifications(
    roomId: string,
    senderId: string,
    content: string,
    type: string,
    fileName?: string
  ): Promise<void> {
    try {
      const room = await this.getRoomForNotifications(roomId);
      if (!room) return;

      const recipients = this.getNotificationRecipients(room, senderId);
      if (recipients.length === 0) return;

      const notification = this.buildNotificationPayload(room, senderId, content, type, fileName);
      await this.sendNotificationsToRecipients(recipients, notification);
    } catch (error) {
      logger.error('Failed to send push notifications:', error);
      throw error;
    }
  }

  /**
   * Get room for notifications with validation
   */
  private async getRoomForNotifications(roomId: string) {
    const room = await this.roomRepo.findByIdWithRelations(roomId);
    if (!room?.participants || !Array.isArray(room.participants)) {
      logger.warn('Room participants not available for push notifications');
      return null;
    }
    return room;
  }

  /**
   * Get notification recipients (exclude sender)
   */
  private getNotificationRecipients(room: any, senderId: string) {
    return room.participants.filter((p: any) => p.userId !== senderId);
  }

  /**
   * Build notification payload
   */
  private buildNotificationPayload(
    room: any,
    senderId: string,
    content: string,
    type: string,
    fileName?: string
  ) {
    const sender = room.participants.find((p: any) => p.userId === senderId)?.user;
    if (!sender) {
      throw new Error('Sender not found in room participants');
    }

    const title = room.isGroup ? `${sender.name} in ${room.name}` : sender.name;
    const body = this.getNotificationBody(type, content, fileName);
    const url = `/chat?roomId=${room.id}`;
    const icon = sender.avatar || '/icon-192x192.png';

    return { title, body, url, icon };
  }

  /**
   * Get notification body based on message type
   */
  private getNotificationBody(type: string, content: string, fileName?: string): string {
    const bodyMap: Record<string, string> = {
      text: content,
      image: '📷 Sent an image',
      file: `📎 Sent a file: ${fileName || 'Attachment'}`,
      video: '🎥 Sent a video',
      audio: '🎵 Sent an audio file',
    };
    return bodyMap[type] || `Sent a ${type}`;
  }

  /**
   * Send notifications to recipients via queue
   */
  private async sendNotificationsToRecipients(recipients: any[], notification: any) {
    if (!this.queueService) {
      logger.warn('QueueService not available, skipping push notifications');
      return;
    }

    // Send via queue (async, non-blocking)
    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        this.queueService.addPushNotification(recipient.userId, notification)
      )
    );

    // Log failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(
          `Failed to queue push notification for user ${recipients[index].userId}:`,
          result.reason
        );
      }
    });
  }
}

