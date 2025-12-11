// ================================
// File Attachment Component
// ================================

"use client";

import { useState, useRef, useEffect } from "react";
import { Image as ImageIcon, Video, File, Download, FileText, Play, X, Maximize2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { VoiceMessage } from "./voice-message";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
          ? "border-primary/20"
          : !isImage && !isVideo
          ? "border-border"
          : ""
      )}>
        {isImage ? (
          <div className="relative group w-full h-[300px] bg-muted rounded-lg overflow-hidden flex items-center justify-center" style={{ transition: "none" }}>
            {/* Loading Spinner */}
            {!imageLoaded && !imageError && (
              <div 
                className="absolute inset-0 w-full h-[300px] bg-muted flex flex-col items-center justify-center rounded-lg z-10" 
                style={{ transition: "none" }}
              >
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-2"></div>
                <p className="text-xs text-muted-foreground">Loading image...</p>
              </div>
            )}
            <Image
              ref={imgRef as any}
              src={fileUrl}
              alt={fileName}
              width={400}
              height={300}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 400px, 400px"
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
                const img = e.currentTarget as HTMLImageElement;
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
              <div className="absolute inset-0 w-full h-[300px] bg-muted flex items-center justify-center rounded-lg z-20">
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Failed to load image</p>
                  <p className="text-xs text-muted-foreground mt-1 break-all px-2">{fileUrl}</p>
                </div>
              </div>
            )}
            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100" style={{ transition: "none" }}>
              <TooltipProvider>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleImageClick}
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-full bg-background/90 hover:bg-background shadow-lg"
                      >
                        <Maximize2 className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View fullscreen</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={(e) => handleDownload(e)}
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-full bg-background/90 hover:bg-background shadow-lg"
                      >
                        <Download className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
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
              isSent ? "bg-primary/10 border-primary/20" : ""
            )}
            onClick={handleDownload}
          >
            <CardContent className="p-4 flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
              isSent
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary"
            )}>
              {(() => {
                const Icon = getFileIcon();
                return <Icon className="w-6 h-6" />;
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                isSent ? "text-primary-foreground" : "text-foreground"
              )}>
                {fileName}
              </p>
              <p className={cn(
                "text-xs",
                isSent ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {formatFileSize(fileSize)}
              </p>
            </div>
            <Download className={cn(
              "w-5 h-5 flex-shrink-0",
              isSent ? "text-primary-foreground/80" : "text-muted-foreground"
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
          <Button
            onClick={() => setShowFullscreen(false)}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            title="Close"
          >
            <X className="w-6 h-6" />
          </Button>
          <Image
            src={fileUrl}
            alt={fileName}
            width={1920}
            height={1080}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
            unoptimized={fileUrl.startsWith('/uploads')}
            style={{ maxWidth: '100%', maxHeight: '100%', height: 'auto', width: 'auto' }}
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

