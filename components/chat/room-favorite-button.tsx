// ================================
// Room Favorite Button Component
// ================================
// Star/unstar button for rooms

'use client';

import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToggleFavorite } from '@/features/channel-favorites';

interface RoomFavoriteButtonProps {
  roomId: string;
  isFavorite: boolean;
  className?: string;
}

export function RoomFavoriteButton({
  roomId,
  isFavorite,
  className,
}: RoomFavoriteButtonProps) {
  const { mutate: toggleFavorite, isPending } = useToggleFavorite();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Prevent event bubbling
    
    toggleFavorite({
      roomId,
      isFavorite: !isFavorite,
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
        isFavorite && "opacity-100",
        className
      )}
      onClick={handleClick}
      disabled={isPending}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={cn(
          "h-4 w-4 transition-colors",
          isFavorite ? "fill-amber-500 text-amber-500" : "text-muted-foreground"
        )}
      />
    </Button>
  );
}

