// ================================
// Users Table Component
// ================================

"use client";

import { useState } from "react";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { apiClient } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import {
  Search,
  MoreVertical,
  Shield,
  Trash2,
  Edit,
  Ban,
  CheckCircle,
} from "lucide-react";
import { cn, getInitials, formatMessageTime } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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


interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastSeen: Date;
  createdAt: Date;
  _count: {
    messages: number;
    rooms: number;
  };
}

interface UsersTableProps {
  initialUsers: User[];
}

export function UsersTable({ initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Use centralized online users hook
  const { onlineUserIds } = useOnlineUsers();

  // Filter users
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  // Update user role
  const updateRole = async (userId: string, role: string) => {
    setIsLoading(userId);
    try {
      await apiClient.patch("/admin/users", { userId, role });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch (error) {
      logger.error("Failed to update role", error instanceof Error ? error : new Error(String(error)), {
        component: 'UsersTable',
        userId,
        role,
      });
    } finally {
      setIsLoading(null);
      setSelectedUser(null);
    }
  };

  // Delete user
  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const deleteUser = async () => {
    if (!userToDelete) return;

    setIsLoading(userToDelete);
    try {
      await apiClient.delete(`/admin/users?userId=${userToDelete}`);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      logger.error("Failed to delete user", error instanceof Error ? error : new Error(String(error)), {
        component: 'UsersTable',
        userId: userToDelete,
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase">
                User
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase">
                Status
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase">
                Role
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase">
                Messages
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase">
                Rooms
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase">
                Joined
              </TableHead>
              <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => {
              const isOnline = onlineUserIds.has(user.id);

              return (
                <TableRow
                  key={user.id}
                  className="hover:bg-accent/50 transition-colors"
                >
                  {/* User */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                          {getInitials(user.name)}
                        </div>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        isOnline
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isOnline ? "bg-green-500" : "bg-muted-foreground/40"
                        )}
                      />
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </TableCell>

                  {/* Role */}
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        user.role === "ADMIN"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      )}
                    >
                      {user.role === "ADMIN" && <Shield className="w-3 h-3" />}
                      {user.role}
                    </span>
                  </TableCell>

                  {/* Messages */}
                  <TableCell className="text-foreground">
                    {user._count.messages}
                  </TableCell>

                  {/* Rooms */}
                  <TableCell className="text-foreground">
                    {user._count.rooms}
                  </TableCell>

                  {/* Joined */}
                  <TableCell className="text-sm text-muted-foreground">
                    {formatMessageTime(user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 relative">
                      <button
                        onClick={() =>
                          setSelectedUser(selectedUser === user.id ? null : user.id)
                        }
                        className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>

                      {/* Dropdown */}
                      {selectedUser === user.id && (
                        <div className="absolute right-0 top-10 z-10 w-48 bg-card rounded-lg shadow-lg border border-border py-1">
                          <button
                            onClick={() =>
                              updateRole(
                                user.id,
                                user.role === "ADMIN" ? "USER" : "ADMIN"
                              )
                            }
                            disabled={isLoading === user.id}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            <Shield className="w-4 h-4" />
                            {user.role === "ADMIN"
                              ? "Remove Admin"
                              : "Make Admin"}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user.id)}
                            disabled={isLoading === user.id}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete User
                          </button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No users found
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-ring"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

