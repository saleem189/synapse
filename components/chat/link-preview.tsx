// ================================
// Link Preview Component
// ================================

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { apiClient } from "@/lib/api-client";
import { ExternalLink, Image as ImageIcon, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
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
          logger.error("Error fetching link preview", err instanceof Error ? err : new Error(String(err)), {
            component: 'LinkPreview',
            url,
          });
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
            ? "bg-primary/10 border-primary/20"
            : "bg-muted/50"
        )}
      >
        <CardContent className="p-3 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
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
          isSent ? "text-primary-foreground/90" : "text-primary"
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
          ? "bg-primary/10 border-primary/20 hover:bg-primary/15"
          : "bg-muted/50 hover:bg-accent"
      )}
    >
      {preview.image && (
        <div className="relative w-full h-48 overflow-hidden bg-muted">
          <Image
            src={preview.image}
            alt={preview.title || "Preview"}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
              isSent ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              {preview.siteName}
            </p>
            <h4 className={cn(
              "text-sm font-semibold mb-1 line-clamp-2",
              isSent ? "text-primary-foreground" : "text-foreground"
            )}>
              {preview.title}
            </h4>
            {preview.description && (
              <p className={cn(
                "text-xs line-clamp-2",
                isSent ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {preview.description}
              </p>
            )}
          </div>
          <ExternalLink className={cn(
            "w-4 h-4 flex-shrink-0 mt-0.5",
            isSent ? "text-primary-foreground/70" : "text-muted-foreground"
          )} />
        </div>
      </CardContent>
    </Card>
  );
}

