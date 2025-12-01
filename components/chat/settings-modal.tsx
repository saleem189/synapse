// ================================
// Settings Modal Component
// ================================

"use client";

import { useState, useRef } from "react";
import { X, User, Bell, Moon, Sun, Shield, LogOut, Camera, Trash2, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { cn, getInitials } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useUserStore } from "@/lib/store";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // Get user from store
  const user = useUserStore((state) => state.user);
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "appearance">("profile");
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use push notifications hook
  const { subscribe, unsubscribe, isSubscribed, permission, isLoading: isPushLoading } = usePushNotifications();

  // Early return after all hooks are called
  if (!user) {
    return null; // Or show loading state
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const data = await apiClient.upload<{ avatar: string }>("/users/avatar", formData);
      setAvatar(data.avatar);
      // Refresh to update avatar everywhere (better than full reload)
      if (typeof window !== 'undefined') {
        window.location.reload(); // TODO: Replace with proper state update
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("An error occurred while uploading the profile picture");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm("Remove profile picture?")) return;

    try {
      await apiClient.delete("/users/avatar");
      setAvatar(null);
      // Refresh to update avatar everywhere (better than full reload)
      if (typeof window !== 'undefined') {
        window.location.reload(); // TODO: Replace with proper state update
      }
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast.error("An error occurred while removing the profile picture");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-surface-200 dark:border-surface-800">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex h-[500px] overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 p-4 space-y-1">
            <Separator orientation="vertical" className="absolute left-48 top-0 bottom-0" />
            <button
              onClick={() => setActiveTab("profile")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                activeTab === "profile"
                  ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                  : "text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
              )}
            >
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">Profile</span>
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                activeTab === "notifications"
                  ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                  : "text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
              )}
            >
              <Bell className="w-4 h-4" />
              <span className="text-sm font-medium">Notifications</span>
            </button>
            <button
              onClick={() => setActiveTab("appearance")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                activeTab === "appearance"
                  ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                  : "text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
              )}
            >
              {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span className="text-sm font-medium">Appearance</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Profile Information</h3>

                  <div className="space-y-6">
                    {/* Profile Picture */}
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
                        Profile Picture
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="w-20 h-20 border-2 border-surface-200 dark:border-surface-700">
                            <AvatarImage src={avatar || undefined} alt={user.name} />
                            <AvatarFallback className="bg-gradient-to-br from-primary-400 to-blue-500 text-white text-xl font-semibold">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          {isUploading && (
                            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={handleAvatarClick}
                            disabled={isUploading}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 transition-colors disabled:opacity-50"
                          >
                            <Camera className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {avatar ? "Change Picture" : "Upload Picture"}
                            </span>
                          </button>
                          {avatar && (
                            <button
                              onClick={handleRemoveAvatar}
                              disabled={isUploading}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="text-sm font-medium">Remove</span>
                            </button>
                          )}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <p className="text-xs text-surface-500">
                            JPG, PNG, GIF or WebP. Max 5MB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Name
                      </label>
                      <Input
                        type="text"
                        defaultValue={user.name}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Email
                      </label>
                      <Input
                        type="email"
                        defaultValue={user.email}
                        disabled
                      />
                      <p className="text-xs text-surface-400 mt-1">Email cannot be changed</p>
                    </div>
                    {user.role === "admin" && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                        <Shield className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600 dark:text-red-400">Administrator Account</span>
                      </div>
                    )}
                    <Button variant="default" className="w-full">Save Changes</Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Notification Settings</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-surface-50 dark:bg-surface-800">
                      <div>
                        <p className="font-medium text-surface-900 dark:text-white">Browser Notifications</p>
                        <p className="text-sm text-surface-500">Get notified when you receive new messages</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSubscribed}
                          onChange={(e) => {
                            if (e.target.checked) {
                              subscribe();
                            } else {
                              unsubscribe();
                            }
                          }}
                          disabled={permission === 'denied' || isPushLoading}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-surface-50 dark:bg-surface-800">
                      <div>
                        <p className="font-medium text-surface-900 dark:text-white">Sound Notifications</p>
                        <p className="text-sm text-surface-500">Play sound when receiving messages</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Appearance</h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setTheme("light")}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all",
                          theme === "light"
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                            : "border-surface-200 dark:border-surface-700 hover:border-surface-300"
                        )}
                      >
                        <Sun className="w-6 h-6 mx-auto mb-2 text-surface-600 dark:text-surface-400" />
                        <p className="text-sm font-medium text-surface-900 dark:text-white">Light</p>
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all",
                          theme === "dark"
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                            : "border-surface-200 dark:border-surface-700 hover:border-surface-300"
                        )}
                      >
                        <Moon className="w-6 h-6 mx-auto mb-2 text-surface-600 dark:text-surface-400" />
                        <p className="text-sm font-medium text-surface-900 dark:text-white">Dark</p>
                      </button>
                      <button
                        onClick={() => setTheme("system")}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all",
                          theme === "system" || !theme
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                            : "border-surface-200 dark:border-surface-700 hover:border-surface-300"
                        )}
                      >
                        <div className="w-6 h-6 mx-auto mb-2 flex items-center justify-center">
                          <Sun className="w-3 h-3 text-surface-600 dark:text-surface-400" />
                          <Moon className="w-3 h-3 text-surface-600 dark:text-surface-400" />
                        </div>
                        <p className="text-sm font-medium text-surface-900 dark:text-white">System</p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <Separator />
        <div className="flex items-center justify-between p-6">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
          <Button onClick={onClose} variant="default">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

