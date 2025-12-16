// ================================
// Settings Modal Component
// ================================

"use client";

import { useState, useRef } from "react";
import { User, Bell, Moon, Sun, Monitor, Shield, LogOut, Camera, Trash2, Loader2, Square, Wand2 } from "lucide-react";
import { useTheme as useNextTheme } from "next-themes";
import { useTheme, useStyle } from "@/lib/design-system/providers";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { useForm } from "react-hook-form";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useUserStore } from "@/lib/store";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // ============================================
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY
  // ============================================
  // Call all hooks first, in the same order every render
  
  // Get user from store
  const user = useUserStore((state) => state.user);
  
  // Use push notifications hook
  const { subscribe, unsubscribe, isSubscribed, permission, isLoading: isPushLoading } = usePushNotifications();
  
  // Design system theme and style hooks (must be called unconditionally per React rules)
  const theme = useTheme();
  const style = useStyle();
  const nextTheme = useNextTheme();
  
  // Local state hooks
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "appearance">("profile");
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [isUploading, setIsUploading] = useState(false);
  const [removeAvatarDialogOpen, setRemoveAvatarDialogOpen] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Next-themes for backward compatibility (handles class toggling)
  const { setTheme: setNextTheme } = nextTheme;

  // Form setup with react-hook-form
  const form = useForm({
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  // Early return after all hooks are called
  if (!user) {
    return null;
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
      logger.error("Error uploading avatar", error instanceof Error ? error : new Error(String(error)), {
        component: 'SettingsModal',
        action: 'uploadAvatar',
        userId: user.id,
      });
      toast.error("An error occurred while uploading the profile picture");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await apiClient.delete("/users/avatar");
      setAvatar(null);
      setRemoveAvatarDialogOpen(false);
      // Refresh to update avatar everywhere (better than full reload)
      if (typeof window !== 'undefined') {
        window.location.reload(); // TODO: Replace with proper state update
      }
    } catch (error) {
      logger.error("Error removing avatar", error instanceof Error ? error : new Error(String(error)), {
        component: 'SettingsModal',
        action: 'removeAvatar',
        userId: user.id,
      });
      toast.error("An error occurred while removing the profile picture");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your profile, notifications, and appearance preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as "profile" | "notifications" | "appearance");
          }}
          className="flex h-[500px] overflow-hidden"
        >
          {/* Sidebar Navigation */}
          <div className="w-48 border-r border-border p-4">
            <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 gap-1">
              <TabsTrigger
                value="profile"
                className="w-full justify-start gap-3 px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Profile</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="w-full justify-start gap-3 px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Bell className="w-4 h-4" />
                <span className="text-sm font-medium">Notifications</span>
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="w-full justify-start gap-3 px-3 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {theme.resolvedTheme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span className="text-sm font-medium">Appearance</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-6">
              <TabsContent value="profile" className="mt-0">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your profile details and avatar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>

                  <Form {...form}>
                    <form className="space-y-6">
                      {/* Profile Picture */}
                      <FormItem>
                        <FormLabel>Profile Picture</FormLabel>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <UserAvatar
                              name={user.name}
                              src={avatar}
                              size="xl"
                              className="border-2 border-border"
                            />
                            {isUploading && (
                              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              onClick={handleAvatarClick}
                              disabled={isUploading}
                              variant="secondary"
                              className="flex items-center gap-2"
                            >
                              <Camera className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {avatar ? "Change Picture" : "Upload Picture"}
                              </span>
                            </Button>
                            {avatar && (
                              <Button
                                type="button"
                                onClick={() => setRemoveAvatarDialogOpen(true)}
                                disabled={isUploading}
                                variant="destructive"
                                className="flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="text-sm font-medium">Remove</span>
                              </Button>
                            )}
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                            <FormDescription>
                              JPG, PNG, GIF or WebP. Max 5MB
                            </FormDescription>
                          </div>
                        </div>
                      </FormItem>

                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} disabled />
                            </FormControl>
                            <FormDescription>Email cannot be changed</FormDescription>
                          </FormItem>
                        )}
                      />
                      {user.role === "ADMIN" && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <Shield className="w-4 h-4 text-destructive" />
                          <span className="text-sm text-destructive">Administrator Account</span>
                        </div>
                      )}
                      <Button type="submit" variant="default" className="w-full">Save Changes</Button>
                    </form>
                  </Form>
                  </CardContent>
                </Card>
              </div>
              </TabsContent>

              <TabsContent value="notifications" className="mt-0">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Settings</CardTitle>
                    <CardDescription>
                      Manage how you receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form className="space-y-4">
                        <FormItem className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted">
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <FormLabel htmlFor="browser-notifications" className="font-medium">
                              Browser Notifications
                            </FormLabel>
                            <FormDescription className="text-sm">
                              Get notified when you receive new messages
                            </FormDescription>
                          </div>
                          <FormControl>
                            <div className="flex-shrink-0">
                              <Switch
                                id="browser-notifications"
                                checked={isSubscribed}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    subscribe();
                                  } else {
                                    unsubscribe();
                                  }
                                }}
                                disabled={permission === 'denied' || isPushLoading}
                              />
                            </div>
                          </FormControl>
                        </FormItem>

                        <FormItem className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted">
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <FormLabel htmlFor="sound-notifications" className="font-medium">
                              Sound Notifications
                            </FormLabel>
                            <FormDescription className="text-sm">
                              Play sound when receiving messages
                            </FormDescription>
                          </div>
                          <FormControl>
                            <div className="flex-shrink-0">
                              <Switch id="sound-notifications" defaultChecked />
                            </div>
                          </FormControl>
                        </FormItem>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
              </TabsContent>

              <TabsContent value="appearance" className="mt-0">
              <div className="space-y-6">
                {/* Theme Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Theme</CardTitle>
                    <CardDescription>
                      Choose your color scheme
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                  <ToggleGroup
                    type="single"
                    value={theme.theme}
                    onValueChange={(value) => {
                      if (value) {
                        theme.setTheme(value as "light" | "dark" | "system");
                        setNextTheme(value as "light" | "dark" | "system");
                      }
                    }}
                    className="grid grid-cols-3 gap-4 w-full"
                  >
                    <ToggleGroupItem
                      value="light"
                      className="p-4 rounded-lg border-2 flex flex-col items-center gap-2 text-center data-[state=on]:border-primary data-[state=on]:bg-primary/10"
                    >
                      <Sun className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm font-medium text-foreground truncate w-full">Light</p>
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="dark"
                      className="p-4 rounded-lg border-2 flex flex-col items-center gap-2 text-center data-[state=on]:border-primary data-[state=on]:bg-primary/10"
                    >
                      <Moon className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm font-medium text-foreground truncate w-full">Dark</p>
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="system"
                      className="p-4 rounded-lg border-2 flex flex-col items-center gap-2 text-center data-[state=on]:border-primary data-[state=on]:bg-primary/10"
                    >
                      <Monitor className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm font-medium text-foreground truncate w-full">System</p>
                    </ToggleGroupItem>
                    </ToggleGroup>
                  </CardContent>
                </Card>

                {/* Style Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Visual Style</CardTitle>
                    <CardDescription>
                      Choose your visual design style
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                  <ToggleGroup
                    type="single"
                    value={style.style}
                    onValueChange={(value) => {
                      if (value) style.setStyle(value as "solid" | "glassmorphic");
                    }}
                    className="grid grid-cols-2 gap-4 w-full"
                  >
                    <ToggleGroupItem
                      value="solid"
                      className="p-4 rounded-lg border-2 flex flex-col items-center gap-2 text-center data-[state=on]:border-primary data-[state=on]:bg-primary/10"
                    >
                      <Square className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm font-medium text-foreground truncate w-full">Solid</p>
                      <p className="text-xs text-muted-foreground truncate w-full">Classic design</p>
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="glassmorphic"
                      className="p-4 rounded-lg border-2 flex flex-col items-center gap-2 text-center data-[state=on]:border-primary data-[state=on]:bg-primary/10"
                    >
                      <Wand2 className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm font-medium text-foreground truncate w-full">Glassmorphic</p>
                      <p className="text-xs text-muted-foreground truncate w-full">Modern blur effect</p>
                    </ToggleGroupItem>
                    </ToggleGroup>
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                      Current: <span className="font-medium text-foreground">{theme.resolvedTheme}</span> theme with <span className="font-medium text-foreground">{style.style}</span> style
                    </p>
                  </CardContent>
                </Card>
              </div>
              </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <Separator />
        <div className="flex items-center justify-between p-6">
          <Button
            onClick={() => signOut({ callbackUrl: "/" })}
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
          <Button onClick={onClose} variant="default">
            Close
          </Button>
        </div>
      </DialogContent>
      <AlertDialog open={removeAvatarDialogOpen} onOpenChange={setRemoveAvatarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Profile Picture</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your profile picture? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAvatar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-ring"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

