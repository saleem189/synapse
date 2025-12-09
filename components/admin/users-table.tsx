// ================================
// Users Table Component
// ================================

"use client";

import { useState } from "react";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { apiClient } from "@/lib/api-client";
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
      console.error("Failed to update role:", error);
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
      console.error("Failed to delete user:", error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
      {/* Search */}
      <div className="p-4 border-b border-surface-200 dark:border-surface-800">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-semibold text-surface-500 uppercase">
                User
              </TableHead>
              <TableHead className="text-xs font-semibold text-surface-500 uppercase">
                Status
              </TableHead>
              <TableHead className="text-xs font-semibold text-surface-500 uppercase">
                Role
              </TableHead>
              <TableHead className="text-xs font-semibold text-surface-500 uppercase">
                Messages
              </TableHead>
              <TableHead className="text-xs font-semibold text-surface-500 uppercase">
                Rooms
              </TableHead>
              <TableHead className="text-xs font-semibold text-surface-500 uppercase">
                Joined
              </TableHead>
              <TableHead className="text-right text-xs font-semibold text-surface-500 uppercase">
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
                  className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                >
                  {/* User */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                          {getInitials(user.name)}
                        </div>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-surface-900" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-surface-900 dark:text-white">
                          {user.name}
                        </p>
                        <p className="text-xs text-surface-500">{user.email}</p>
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
                          : "bg-surface-100 text-surface-500 dark:bg-surface-800"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isOnline ? "bg-green-500" : "bg-surface-400"
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
                  <TableCell className="text-surface-600 dark:text-surface-300">
                    {user._count.messages}
                  </TableCell>

                  {/* Rooms */}
                  <TableCell className="text-surface-600 dark:text-surface-300">
                    {user._count.rooms}
                  </TableCell>

                  {/* Joined */}
                  <TableCell className="text-sm text-surface-500">
                    {formatMessageTime(user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 relative">
                      <button
                        onClick={() =>
                          setSelectedUser(selectedUser === user.id ? null : user.id)
                        }
                        className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-center"
                      >
                        <MoreVertical className="w-4 h-4 text-surface-500" />
                      </button>

                      {/* Dropdown */}
                      {selectedUser === user.id && (
                        <div className="absolute right-0 top-10 z-10 w-48 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1">
                          <button
                            onClick={() =>
                              updateRole(
                                user.id,
                                user.role === "ADMIN" ? "USER" : "ADMIN"
                              )
                            }
                            disabled={isLoading === user.id}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-700"
                          >
                            <Shield className="w-4 h-4" />
                            {user.role === "ADMIN"
                              ? "Remove Admin"
                              : "Make Admin"}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user.id)}
                            disabled={isLoading === user.id}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
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
        <div className="p-8 text-center text-surface-500">
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
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

