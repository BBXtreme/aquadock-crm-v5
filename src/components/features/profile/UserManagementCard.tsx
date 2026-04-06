// src/components/features/profile/UserManagementCard.tsx
// Client Component for User Management
// This component displays a table of all users (only visible to admins) and allows the admin to change user roles, trigger password resets, and delete users.
// It uses buttons with loading states for each action and includes a confirmation dialog for deletions.

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Pencil, Plus, Shield, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { changeUserRole, createUser, deleteUser, triggerPasswordReset, updateUserDisplayName } from "@/lib/services/profile";
import { formatDateDistance, safeDisplay } from "@/lib/utils/data-format";

// Client Component for User Management
function UserManagementCard({
  allUsers,
}: {
  allUsers: {
    id: string;
    email: string;
    display_name: string | null;
    role: string;
    created_at: string | null;
    updated_at: string | null;
    last_sign_in_at: string | null;
  }[];
}) {
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [loadingReset, setLoadingReset] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createRole, setCreateRole] = useState<'user' | 'admin'>('user');
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

  const handleEditDisplayName = async () => {
    if (!editUserId) return;
    setLoadingEdit(editUserId);
    try {
      const formData = new FormData();
      formData.append('userId', editUserId);
      formData.append('display_name', editDisplayName);
      await updateUserDisplayName(formData);
      toast.success("Display name updated successfully");
      setEditUserId(null);
      queryClient.invalidateQueries();
      router.refresh();
    } catch (_error) {
      toast.error("Failed to update display name");
    } finally {
      setLoadingEdit(null);
    }
  };

  const handleCreateUser = async () => {
    setLoadingCreate(true);
    try {
      const formData = new FormData();
      formData.append('email', createEmail);
      formData.append('display_name', createDisplayName);
      formData.append('role', createRole);
      await createUser(formData);
      toast.success("User created successfully.");
      setCreateDialogOpen(false);
      setCreateEmail('');
      setCreateDisplayName('');
      setCreateRole('user');
      queryClient.invalidateQueries();
      router.refresh();
    } catch (error) {
      console.error("Create user error:", error);
      toast.error("Failed to create user");
    } finally {
      setLoadingCreate(false);
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
        <CardHeader className="flex justify-between items-center pb-6">
          <CardTitle className="flex items-center text-xl">
            <Users className="mr-3 h-6 w-6 text-primary" />
            User Management
          </CardTitle>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New User Account
          </Button>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead>Zuletzt angemeldet</TableHead>
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
                      <TableCell>{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>{u.updated_at ? new Date(u.updated_at).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default tabular-nums text-muted-foreground">
                              {formatDateDistance(u.last_sign_in_at)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {u.last_sign_in_at
                              ? new Date(u.last_sign_in_at).toLocaleString("de-DE", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : safeDisplay(u.last_sign_in_at)}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditUserId(u.id); setEditDisplayName(u.display_name || ''); }}
                          disabled={loadingEdit === u.id}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
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
          </TooltipProvider>
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User Account</DialogTitle>
            <DialogDescription>
              Create a new user account. A password reset email will be sent to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="Email"
              type="email"
            />
            <Input
              value={createDisplayName}
              onChange={(e) => setCreateDisplayName(e.target.value)}
              placeholder="Display name"
            />
            <Select value={createRole} onValueChange={(value: 'user' | 'admin') => setCreateRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={loadingCreate}
            >
              {loadingCreate ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUserId} onOpenChange={() => setEditUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Display Name</DialogTitle>
            <DialogDescription>
              Update the display name for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              placeholder="Display name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditDisplayName}
              disabled={loadingEdit === editUserId}
            >
              {loadingEdit === editUserId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
