// ================================
// File Attachment Component
// ================================

"use client";

import { useState, useRef, useEffect } from "react";
import { Image, Video, File, Download, FileText, Play, X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceMessage } from "./voice-message";
import { Card, CardContent } from "@/components/ui/card";

interface FileAttachmentProps {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  isSent: boolean;
}

export function FileAttachment({
  fileUrl,
  fileName,
  fileSize,
  fileType,
  isSent,
}: FileAttachmentProps) {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const isImage = fileType.startsWith("image/");
  const isVideo = fileType.startsWith("video/");
  const isAudio = fileType.startsWith("audio/");
  const isPdf = fileType === "application/pdf";
  const isText = fileType.startsWith("text/");

  // Check if image is already loaded (cached) and add timeout fallback
  useEffect(() => {
    if (isImage && imgRef.current) {
      // Check if image is already loaded (cached)
      if (imgRef.current.complete && imgRef.current.naturalHeight !== 0) {
        setImageLoaded(true);
        setImageError(false);
        return;
      }

      // Fallback: If image doesn't load within 5 seconds, show it anyway
      const timeout = setTimeout(() => {
        if (imgRef.current && imgRef.current.complete) {
          setImageLoaded(true);
          setImageError(false);
        }
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [isImage, fileUrl]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = () => {
    if (isPdf || isText) return FileText;
    return File;
  };

  const handleDownload = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    window.open(fileUrl, "_blank");
  };

  const handleImageClick = () => {
    if (isImage) {
      setShowFullscreen(true);
    }
  };

  return (
    <>
      <div className={cn(
        "rounded-lg overflow-hidden",
        isImage && "max-w-[400px] h-[300px]",
        isVideo && "max-w-md",
        !isImage && !isVideo && "border",
        isSent && !isImage && !isVideo
          ? "border-primary-500/30"
          : !isImage && !isVideo
          ? "border-surface-200 dark:border-surface-700"
          : ""
      )}>
        {isImage ? (
          <div className="relative group w-full h-[300px] bg-surface-100 dark:bg-surface-800 rounded-lg overflow-hidden flex items-center justify-center" style={{ transition: "none" }}>
            {/* Loading Spinner */}
            {!imageLoaded && !imageError && (
              <div 
                className="absolute inset-0 w-full h-[300px] bg-surface-100 dark:bg-surface-800 flex flex-col items-center justify-center rounded-lg z-10" 
                style={{ transition: "none" }}
              >
                <div className="w-10 h-10 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin mb-2"></div>
                <p className="text-xs text-surface-500 dark:text-surface-400">Loading image...</p>
              </div>
            )}
            <Image
              ref={imgRef}
              src={fileUrl}
              alt={fileName}
              width={400}
              height={300}
              className={cn(
                "rounded-lg cursor-pointer",
                "max-h-[300px] max-w-full object-contain"
              )}
              style={{ 
                position: "relative",
                zIndex: imageLoaded ? 2 : 1,
                maxHeight: "300px",
                maxWidth: "400px",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                opacity: imageLoaded ? 1 : 0,
                pointerEvents: imageLoaded ? "auto" : "none"
              }}
              onClick={handleImageClick}
              onLoad={(e) => {
                const img = e.currentTarget;
                // Check if image is actually loaded
                if (img.complete && (img.naturalWidth > 0 || img.naturalHeight > 0)) {
                  setImageLoaded(true);
                  setImageError(false);
                } else {
                  // Force show after a short delay if dimensions are 0
                  setTimeout(() => {
                    if (img.complete) {
                      setImageLoaded(true);
                      setImageError(false);
                    }
                  }, 100);
                }
              }}
              onError={() => {
                setImageError(true);
                setImageLoaded(false);
              }}
              unoptimized={fileUrl.startsWith('/uploads')} // Unoptimize local uploads
            />
            {imageError && (
              <div className="absolute inset-0 w-full h-[300px] bg-surface-100 dark:bg-surface-800 flex items-center justify-center rounded-lg z-20">
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 text-surface-400 mx-auto mb-2" />
                  <p className="text-xs text-surface-500">Failed to load image</p>
                  <p className="text-xs text-surface-400 mt-1 break-all px-2">{fileUrl}</p>
                </div>
              </div>
            )}
            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100" style={{ transition: "none" }}>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleImageClick}
                  className="w-10 h-10 rounded-full bg-white/90 dark:bg-surface-900/90 flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                  title="View fullscreen"
                >
                  <Maximize2 className="w-5 h-5 text-surface-900 dark:text-white" />
                </button>
                <button
                  onClick={(e) => handleDownload(e)}
                  className="w-10 h-10 rounded-full bg-white/90 dark:bg-surface-900/90 flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                  title="Download"
                >
                  <Download className="w-5 h-5 text-surface-900 dark:text-white" />
                </button>
              </div>
            </div>
          </div>
        ) : isVideo ? (
          <div className="relative group">
            <video
              src={fileUrl}
              className="max-w-md max-h-96 rounded-lg"
              controls
              preload="metadata"
              poster="" // You can add a poster image if needed
            />
          </div>
        ) : isAudio ? (
          <VoiceMessage
            audioUrl={fileUrl}
            isSent={isSent}
            fileName={fileName}
          />
        ) : (
          <Card
            className={cn(
              "cursor-pointer hover:shadow-md transition-all",
              isSent ? "bg-primary-500/10 border-primary-400/30" : ""
            )}
            onClick={handleDownload}
          >
            <CardContent className="p-4 flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
              isSent
                ? "bg-primary-600 text-white"
                : "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
            )}>
              {(() => {
                const Icon = getFileIcon();
                return <Icon className="w-6 h-6" />;
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                isSent ? "text-white" : "text-surface-900 dark:text-white"
              )}>
                {fileName}
              </p>
              <p className={cn(
                "text-xs",
                isSent ? "text-primary-200" : "text-surface-500"
              )}>
                {formatFileSize(fileSize)}
              </p>
            </div>
            <Download className={cn(
              "w-5 h-5 flex-shrink-0",
              isSent ? "text-primary-200" : "text-surface-400"
            )} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fullscreen Image Viewer */}
      {showFullscreen && isImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 px-4 py-2 rounded-lg">
            <p className="text-white text-sm">{fileName}</p>
            <p className="text-white/70 text-xs">{formatFileSize(fileSize)}</p>
          </div>
        </div>
      )}
    </>
  );
}

