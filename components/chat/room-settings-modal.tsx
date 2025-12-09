// ================================
// Room Settings Modal Component
// ================================

"use client";

import { useState } from "react";
import { X, Upload, Image as ImageIcon, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: {
    id: string;
    name: string;
    description?: string | null;
    avatar?: string | null;
    isGroup: boolean;
  };
  onUpdate: () => void;
}

export function RoomSettingsModal({
  isOpen,
  onClose,
  room,
  onUpdate,
}: RoomSettingsModalProps) {
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || "");
  const [avatar, setAvatar] = useState(room.avatar || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.patch(`/rooms/${room.id}`, {
        name: name.trim(),
        description: description.trim() || null,
        avatar: avatar.trim() || null,
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating room:", error);
      // Error toast is handled by API client
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, just use file name as URL (would need upload API)
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Room Settings</DialogTitle>
          <DialogDescription>
            Update the room name, description, and avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div
                className={cn(
                  "w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-bold",
                  avatar
                    ? "bg-gradient-to-br from-primary-400 to-accent-500"
                    : "bg-gradient-to-br from-primary-500 to-accent-500"
                )}
                style={
                  avatar && avatar.startsWith("http")
                    ? { backgroundImage: `url(${avatar})`, backgroundSize: "cover" }
                    : undefined
                }
              >
                {!avatar || !avatar.startsWith("http") ? room.name.charAt(0).toUpperCase() : null}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-700 transition-colors">
                <Upload className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-surface-500">Click icon to upload avatar</p>
          </div>

          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Room Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter room name"
              maxLength={50}
            />
          </div>

          {/* Description */}
          {room.isGroup && (
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter room description (optional)"
                rows={3}
                maxLength={200}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            variant="default"
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

