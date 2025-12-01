// ================================
// Link Preview Component
// ================================

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { apiClient } from "@/lib/api-client";
import { ExternalLink, Image as ImageIcon, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface LinkPreviewProps {
  url: string;
  isSent: boolean;
}

interface PreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

export function LinkPreview({ url, isSent }: LinkPreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPreview = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await apiClient.post<{ preview: PreviewData }>("/link-preview", { url }, {
          showErrorToast: false, // Don't show toast for link preview errors
        });

        if (isMounted) {
          setPreview(data.preview);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load preview");
          console.error("Error fetching link preview:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPreview();

    return () => {
      isMounted = false;
    };
  }, [url]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <Card
        className={cn(
          "mt-2 overflow-hidden",
          isSent
            ? "bg-primary-500/10 border-primary-400/30"
            : "bg-surface-50 dark:bg-surface-800/50"
        )}
      >
        <CardContent className="p-3 animate-pulse">
          <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded w-1/2"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !preview) {
    // Fallback: show simple link
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={cn(
          "mt-2 inline-flex items-center gap-1.5 text-sm underline",
          isSent ? "text-primary-100" : "text-primary-600 dark:text-primary-400"
        )}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        {url}
      </a>
    );
  }

  return (
    <Card
      onClick={handleClick}
      className={cn(
        "mt-2 overflow-hidden cursor-pointer transition-all duration-200",
        "hover:shadow-md",
        isSent
          ? "bg-primary-500/10 border-primary-400/30 hover:bg-primary-500/15"
          : "bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800"
      )}
    >
      {preview.image && (
        <div className="relative w-full h-48 overflow-hidden bg-surface-100 dark:bg-surface-900">
          <Image
            src={preview.image}
            alt={preview.title || "Preview"}
            fill
            className="object-cover"
            onError={() => {
              // Image error handled by Next.js Image component
            }}
            unoptimized // Link preview images from external sources
          />
        </div>
      )}

      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {preview.favicon && (
            <img
              src={preview.favicon}
              alt=""
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-xs font-medium mb-0.5 truncate",
              isSent ? "text-primary-200" : "text-surface-500 dark:text-surface-400"
            )}>
              {preview.siteName}
            </p>
            <h4 className={cn(
              "text-sm font-semibold mb-1 line-clamp-2",
              isSent ? "text-white" : "text-surface-900 dark:text-white"
            )}>
              {preview.title}
            </h4>
            {preview.description && (
              <p className={cn(
                "text-xs line-clamp-2",
                isSent ? "text-primary-100/80" : "text-surface-600 dark:text-surface-400"
              )}>
                {preview.description}
              </p>
            )}
          </div>
          <ExternalLink className={cn(
            "w-4 h-4 flex-shrink-0 mt-0.5",
            isSent ? "text-primary-200" : "text-surface-400"
          )} />
        </div>
      </CardContent>
    </Card>
  );
}

