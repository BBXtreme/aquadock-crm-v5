// src/components/features/profile/UserManagementCard.tsx
// Client Component for User Management
// This component displays a table of all users (only visible to admins) and allows the admin to change user roles, trigger password resets, and delete users.
// It uses buttons with loading states for each action and includes a confirmation dialog for deletions.

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Shield, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { changeUserRole, deleteUser, triggerPasswordReset } from "@/lib/supabase/services/profile";

// Client Component for User Management
function UserManagementCard({ allUsers }: { allUsers: { id: string; email: string; display_name: string | null; role: string }[] }) {
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [loadingReset, setLoadingReset] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setLoadingRole(userId);
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('newRole', newRole);
      await changeUserRole(formData);
      toast.success("Role updated successfully");
      queryClient.invalidateQueries();
      router.refresh();
    } catch (_error) {
      toast.error("Failed to update role");
    } finally {
      setLoadingRole(null);
    }
  };

  const handlePasswordReset = async (userId: string) => {
    setLoadingReset(userId);
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      await triggerPasswordReset(formData);
      toast.success("Password reset email sent");
    } catch (_error) {
      toast.error("Failed to send reset email");
    } finally {
      setLoadingReset(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteUserId) return;
    setLoadingDelete(deleteUserId);
    try {
      const formData = new FormData();
      formData.append('userId', deleteUserId);
      await deleteUser(formData);
      toast.success("User deleted successfully");
      setDeleteUserId(null);
      queryClient.invalidateQueries();
      router.refresh();
    } catch (_error) {
      toast.error("Failed to delete user");
    } finally {
      setLoadingDelete(null);
    }
  };

  return (
    <>
      <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center text-xl">
            <Users className="mr-3 h-6 w-6 text-primary" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.display_name || 'No display name'}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleChangeRole(u.id, u.role)}
                          disabled={loadingRole === u.id}
                        >
                          {loadingRole === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Shield className="h-4 w-4 mr-1" />
                          )}
                          {u.role === 'admin' ? 'Demote' : 'Promote'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePasswordReset(u.id)}
                          disabled={loadingReset === u.id}
                        >
                          {loadingReset === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4 mr-1" />
                          )}
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteUserId(u.id)}
                          disabled={loadingDelete === u.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={loadingDelete === deleteUserId}
            >
              {loadingDelete === deleteUserId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default UserManagementCard;
