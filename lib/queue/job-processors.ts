// ================================
// Job Processors
// ================================
// Processors for different job types

import { Job } from 'bullmq';
import prisma from '@/lib/prisma';
import webpush from 'web-push';
import sharp from 'sharp';
import { readFile, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// Configure web-push with VAPID keys (same as push.service.ts)
if (
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.NEXT_PUBLIC_VAPID_SUBJECT
) {
  webpush.setVapidDetails(
    process.env.NEXT_PUBLIC_VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Simple logger for processors
const logger = {
  log: (msg: string, ...args: any[]) => console.log(`[Worker] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[Worker] ❌ ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[Worker] ⚠️ ${msg}`, ...args),
};

/**
 * Process push notification job
 */
export async function processPushNotification(job: Job) {
  const { userId, payload } = job.data as {
    userId: string;
    payload: {
      title: string;
      body: string;
      url?: string;
      icon?: string;
    };
  };

  logger.log(`📤 Processing push notification job ${job.id} for user ${userId}`);

  try {
    // Get all subscriptions for the user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      logger.log(`No subscriptions found for user ${userId}`);
      return { sent: 0, total: 0 };
    }

    const notificationPayload = JSON.stringify(payload);
    let sent = 0;
    let failed = 0;

    // Send to all subscriptions
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            notificationPayload
          );
          sent++;
        } catch (error: any) {
          // If subscription is invalid (410 Gone), delete it
          if (error.statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
            logger.log(`Removed invalid subscription ${sub.id}`);
          } else {
            logger.error(`Error sending push notification to ${sub.id}:`, error.message);
          }
          failed++;
        }
      })
    );

    logger.log(`✅ Push notification job ${job.id} completed: ${sent} sent, ${failed} failed`);
    return { sent, failed, total: subscriptions.length };
  } catch (error: any) {
    logger.error(`❌ Push notification job ${job.id} failed:`, error.message);
    throw error; // Re-throw to trigger retry
  }
}

/**
 * Process image compression job
 */
export async function processImage(job: Job) {
  const { filePath, outputPath, options } = job.data as {
    filePath: string;
    outputPath: string;
    options?: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    };
  };

  logger.log(`🖼️ Processing image job ${job.id}: ${filePath}`);

  try {
    const publicDir = join(process.cwd(), 'public');
    const fullInputPath = join(publicDir, filePath);
    const fullOutputPath = join(publicDir, outputPath);

    // Check if input file exists
    if (!existsSync(fullInputPath)) {
      throw new Error(`Input file not found: ${fullInputPath}`);
    }

    // Read image
    const imageBuffer = await readFile(fullInputPath);
    
    // Process with sharp
    let sharpInstance = sharp(imageBuffer);

    // Resize if needed
    const metadata = await sharpInstance.metadata();
    const maxWidth = options?.maxWidth || 1920;
    const maxHeight = options?.maxHeight || 1920;
    
    if (metadata.width && metadata.height) {
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
    }

    // Convert format and compress
    const format = options?.format || 'webp';
    const quality = options?.quality || 85;

    let processedBuffer: Buffer;
    if (format === 'jpeg') {
      processedBuffer = await sharpInstance
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    } else if (format === 'png') {
      processedBuffer = await sharpInstance
        .png({ quality, compressionLevel: 9 })
        .toBuffer();
    } else {
      processedBuffer = await sharpInstance
        .webp({ quality })
        .toBuffer();
    }

    // Ensure output directory exists
    const outputDir = join(fullOutputPath, '..');
    const { mkdir } = await import('fs/promises');
    await mkdir(outputDir, { recursive: true });

    // Write compressed image
    await writeFile(fullOutputPath, processedBuffer);

    // Get file sizes
    const originalSize = imageBuffer.length;
    const compressedSize = processedBuffer.length;
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

    logger.log(`✅ Image job ${job.id} completed: ${savings}% size reduction`);
    
    // Optionally delete original if different path
    if (fullInputPath !== fullOutputPath && existsSync(fullInputPath)) {
      await unlink(fullInputPath);
      logger.log(`🗑️ Deleted original file: ${filePath}`);
    }

    return {
      originalSize,
      compressedSize,
      savings: parseFloat(savings),
      outputPath,
    };
  } catch (error: any) {
    logger.error(`❌ Image job ${job.id} failed:`, error.message);
    throw error;
  }
}

/**
 * Process video compression job
 * Note: Video compression requires ffmpeg, which is complex
 * For now, we'll just validate and return metadata
 * Full video compression can be added later with ffmpeg
 */
export async function processVideo(job: Job) {
  const { filePath, outputPath } = job.data as {
    filePath: string;
    outputPath: string;
  };

  logger.log(`🎥 Processing video job ${job.id}: ${filePath}`);

  try {
    const publicDir = join(process.cwd(), 'public');
    const fullInputPath = join(publicDir, filePath);
    const fullOutputPath = join(publicDir, outputPath);

    if (!existsSync(fullInputPath)) {
      throw new Error(`Input file not found: ${fullInputPath}`);
    }

    // For now, just copy and return metadata
    // Full video compression requires ffmpeg installation
    const videoBuffer = await readFile(fullInputPath);
    
    // Ensure output directory exists
    const outputDir = join(fullOutputPath, '..');
    const { mkdir } = await import('fs/promises');
    await mkdir(outputDir, { recursive: true });

    await writeFile(fullOutputPath, videoBuffer);

    logger.log(`✅ Video job ${job.id} completed (no compression - ffmpeg not configured)`);
    logger.warn(`⚠️ Video compression requires ffmpeg. Install with: npm install fluent-ffmpeg`);

    return {
      originalSize: videoBuffer.length,
      compressedSize: videoBuffer.length,
      savings: 0,
      outputPath,
      note: 'Video compression requires ffmpeg',
    };
  } catch (error: any) {
    logger.error(`❌ Video job ${job.id} failed:`, error.message);
    throw error;
  }
}

/**
 * Optimize avatar image
 * Creates optimized version for profile pictures
 */
export async function optimizeAvatar(job: Job) {
  const { filePath, userId } = job.data as {
    filePath: string;
    userId: string;
  };

  logger.log(`👤 Optimizing avatar job ${job.id} for user ${userId}`);

  try {
    const publicDir = join(process.cwd(), 'public');
    const fullInputPath = join(publicDir, filePath);

    if (!existsSync(fullInputPath)) {
      throw new Error(`Input file not found: ${fullInputPath}`);
    }

    // Read image
    const imageBuffer = await readFile(fullInputPath);

    // Process: resize to 400x400, convert to WebP, optimize
    const processedBuffer = await sharp(imageBuffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 90 })
      .toBuffer();

    // Generate optimized filename
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const nameWithoutExt = fileName.split('.')[0];
    const optimizedPath = `avatars/${nameWithoutExt}_optimized.webp`;
    const fullOutputPath = join(publicDir, optimizedPath);

    // Write optimized avatar
    await writeFile(fullOutputPath, processedBuffer);

    // Update user's avatar in database
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: `/${optimizedPath}` },
    });

    // Delete original if different
    if (fullInputPath !== fullOutputPath && existsSync(fullInputPath)) {
      await unlink(fullInputPath);
    }

    const originalSize = imageBuffer.length;
    const compressedSize = processedBuffer.length;
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

    logger.log(`✅ Avatar job ${job.id} completed: ${savings}% size reduction`);

    return {
      originalSize,
      compressedSize,
      savings: parseFloat(savings),
      outputPath: optimizedPath,
    };
  } catch (error: any) {
    logger.error(`❌ Avatar job ${job.id} failed:`, error.message);
    throw error;
  }
}

