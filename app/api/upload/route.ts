// ================================
// File Upload API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getService } from "@/lib/di";
import { QueueService } from "@/lib/queue/queue-service";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.error("Upload error: No file in formData");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Log file info for debugging
    console.log("File upload received:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      console.error("Upload error: File type not allowed", {
        fileType: file.type,
        fileName: file.name,
        allowedTypes,
      });
      return NextResponse.json(
        { error: `File type not allowed. Received: ${file.type || "unknown"}` },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Convert file to buffer and save temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Determine if file needs processing
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    // Get queue service
    const queueService = getService<QueueService>("queueService");

    let fileUrl = `/uploads/${fileName}`;
    let processingJobId: string | null = null;

    // Queue processing for images and videos
    if (isImage) {
      // For images, compress and optimize
      const optimizedFileName = `${timestamp}_${randomString}_optimized.webp`;
      const optimizedPath = `uploads/${optimizedFileName}`;
      
      processingJobId = await queueService.addImageProcessing(
        fileUrl,
        optimizedPath,
        {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 85,
          format: "webp",
        }
      );
      
      // Return original URL immediately, optimized version will be available later
      fileUrl = `/uploads/${optimizedFileName}`;
    } else if (isVideo) {
      // For videos, queue processing (compression requires ffmpeg)
      const processedFileName = `${timestamp}_${randomString}_processed.${fileExtension}`;
      const processedPath = `uploads/${processedFileName}`;
      
      processingJobId = await queueService.addVideoProcessing(
        fileUrl,
        processedPath
      );
      
      // Return original URL for now
    }

    return NextResponse.json({
      url: fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      processing: processingJobId ? { jobId: processingJobId, status: "queued" } : undefined,
      note: isImage || isVideo 
        ? "File uploaded successfully. Processing in background. Optimized version will be available shortly."
        : undefined,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : String(error) },
      { status: 500 }
    );
  }
}

