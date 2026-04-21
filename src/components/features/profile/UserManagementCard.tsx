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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { acceptPendingUser, declinePendingUser } from "@/lib/actions/onboarding";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { changeUserRole, createUser, deleteUser, triggerPasswordReset, updateUserDisplayName } from "@/lib/services/profile";
import { formatDateDistance, safeDisplay } from "@/lib/utils/data-format";
import type { PendingUser } from "@/types/database.types";

// Client Component for User Management
function UserManagementCard({
  allUsers,
  pendingUsers,
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
  pendingUsers: PendingUser[];
}) {
  const t = useT("settings");
  const localeTag = useNumberLocaleTag();
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
  const [pendingRoleById, setPendingRoleById] = useState<
    Record<string, "user" | "admin">
  >({});
  const [loadingPendingAction, setLoadingPendingAction] = useState<
    string | null
  >(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const roleForPending = (id: string): "user" | "admin" =>
    pendingRoleById[id] ?? "user";

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setLoadingRole(userId);
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('newRole', newRole);
      await changeUserRole(formData);
      toast.success(t("userManagement.toastRoleUpdated"));
      queryClient.invalidateQueries();
      router.refresh();
    } catch (_error) {
      toast.error(t("userManagement.toastRoleUpdateFailed"));
    } finally {
      setLoadingRole(null);
    }
  };

  const handlePasswordReset = async (userId: string) => {
    setLoadingReset(userId);
    try {
      await triggerPasswordReset(userId);
      toast.success(t("userManagement.toastResetEmailSent"));
      queryClient.invalidateQueries();
      router.refresh();
    } catch (error) {
      const rateLimited =
        error instanceof Error &&
        error.message === "RESET_EMAIL_RATE_LIMITED";
      toast.error(
        rateLimited
          ? t("userManagement.toastResetEmailRateLimited")
          : t("userManagement.toastResetEmailFailed"),
      );
    } finally {
      setLoadingReset(null);
    }
  };

  const handleEditDisplayName = async () => {
    if (editUserId === null) return;
    setLoadingEdit(editUserId);
    try {
      const formData = new FormData();
      formData.append('userId', editUserId);
      formData.append('display_name', editDisplayName);
      await updateUserDisplayName(formData);
      toast.success(t("userManagement.toastDisplayNameUpdated"));
      setEditUserId(null);
      queryClient.invalidateQueries();
      router.refresh();
    } catch (_error) {
      toast.error(t("userManagement.toastDisplayNameFailed"));
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
      toast.success(t("userManagement.toastUserCreated"));
      setCreateDialogOpen(false);
      setCreateEmail('');
      setCreateDisplayName('');
      setCreateRole('user');
      queryClient.invalidateQueries();
      router.refresh();
    } catch (error) {
      console.error("Create user error:", error);
      toast.error(t("userManagement.toastUserCreateFailed"));
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleAcceptPending = async (pendingId: string) => {
    setLoadingPendingAction(`accept-${pendingId}`);
    try {
      const formData = new FormData();
      formData.append("pendingId", pendingId);
      formData.append("chosenRole", roleForPending(pendingId));
      await acceptPendingUser(formData);
      toast.success(t("userManagement.toastAcceptOk"));
      queryClient.invalidateQueries();
      router.refresh();
    } catch (_error) {
      toast.error(t("userManagement.toastAcceptFail"));
    } finally {
      setLoadingPendingAction(null);
    }
  };

  const handleDeclinePending = async (pendingId: string) => {
    setLoadingPendingAction(`decline-${pendingId}`);
    try {
      const formData = new FormData();
      formData.append("pendingId", pendingId);
      await declinePendingUser(formData);
      toast.success(t("userManagement.toastDeclineOk"));
      queryClient.invalidateQueries();
      router.refresh();
    } catch (_error) {
      toast.error(t("userManagement.toastDeclineFail"));
    } finally {
      setLoadingPendingAction(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteUserId === null) return;
    setLoadingDelete(deleteUserId);
    try {
      const formData = new FormData();
      formData.append('userId', deleteUserId);
      await deleteUser(formData);
      toast.success(t("userManagement.toastUserDeleted"));
      setDeleteUserId(null);
      queryClient.invalidateQueries();
      router.refresh();
    } catch (_error) {
      toast.error(t("userManagement.toastUserDeleteFailed"));
    } finally {
      setLoadingDelete(null);
    }
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center text-xl">
            <Users className="mr-3 h-6 w-6 text-primary" />
            {t("userManagement.cardTitle")}
          </CardTitle>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("userManagement.userCreateButtonLabel")}
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="users" type="button">
                {t("userManagement.usersTab")}
              </TabsTrigger>
              <TabsTrigger value="pending" type="button">
                {t("userManagement.pendingTab")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-0">
              <TooltipProvider>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("userManagement.pendingColEmail")}</TableHead>
                        <TableHead>{t("userManagement.pendingColName")}</TableHead>
                        <TableHead>{t("userManagement.pendingColStatus")}</TableHead>
                        <TableHead>{t("userManagement.pendingColRequested")}</TableHead>
                        <TableHead>{t("userManagement.roleOnAccept")}</TableHead>
                        <TableHead>{t("userManagement.colActions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            {t("userManagement.pendingEmpty")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingUsers.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{p.email}</TableCell>
                            <TableCell>
                              {p.display_name === null || p.display_name === ""
                                ? t("userManagement.noDisplayName")
                                : safeDisplay(p.display_name)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {p.status.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {p.requested_at
                                ? new Date(p.requested_at).toLocaleString(localeTag)
                                : t("userManagement.notAvailable")}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={roleForPending(p.id)}
                                onValueChange={(value: "user" | "admin") => {
                                  setPendingRoleById((prev) => ({
                                    ...prev,
                                    [p.id]: value,
                                  }));
                                }}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">{t("userManagement.roleUser")}</SelectItem>
                                  <SelectItem value="admin">{t("userManagement.roleAdmin")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  type="button"
                                  disabled={
                                    p.status !== "pending_review" ||
                                    loadingPendingAction !== null
                                  }
                                  onClick={() => void handleAcceptPending(p.id)}
                                >
                                  {loadingPendingAction === `accept-${p.id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    t("userManagement.accept")
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="destructive"
                                  disabled={
                                    p.status !== "pending_review" ||
                                    loadingPendingAction !== null
                                  }
                                  onClick={() => void handleDeclinePending(p.id)}
                                >
                                  {loadingPendingAction === `decline-${p.id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    t("userManagement.decline")
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TooltipProvider>
            </TabsContent>
            <TabsContent value="users" className="mt-0">
          <TooltipProvider>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("userManagement.colDisplayName")}</TableHead>
                    <TableHead>{t("userManagement.colEmail")}</TableHead>
                    <TableHead>{t("userManagement.colRole")}</TableHead>
                    <TableHead>{t("userManagement.colCreatedAt")}</TableHead>
                    <TableHead>{t("userManagement.colUpdatedAt")}</TableHead>
                    <TableHead>{t("userManagement.colLastSignIn")}</TableHead>
                    <TableHead>{t("userManagement.colActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.display_name || t("userManagement.noDisplayName")}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString(localeTag) : t("userManagement.notAvailable")}
                      </TableCell>
                      <TableCell>
                        {u.updated_at ? new Date(u.updated_at).toLocaleDateString(localeTag) : t("userManagement.notAvailable")}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default tabular-nums text-muted-foreground">
                              {formatDateDistance(u.last_sign_in_at)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {u.last_sign_in_at
                              ? new Date(u.last_sign_in_at).toLocaleString(localeTag, {
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
                          {u.role === "admin" ? t("userManagement.demote") : t("userManagement.promote")}
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
                          {t("userManagement.resetPassword")}
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("userManagement.createDialogTitle")}</DialogTitle>
            <DialogDescription>{t("userManagement.createDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder={t("userManagement.emailPlaceholder")}
              type="email"
            />
            <Input
              value={createDisplayName}
              onChange={(e) => setCreateDisplayName(e.target.value)}
              placeholder={t("userManagement.displayNamePlaceholder")}
            />
            <Select value={createRole} onValueChange={(value: 'user' | 'admin') => setCreateRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("userManagement.selectRolePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t("userManagement.roleUser")}</SelectItem>
                <SelectItem value="admin">{t("userManagement.roleAdmin")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t("userManagement.cancel")}
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={loadingCreate}
            >
              {loadingCreate ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t("userManagement.createUser")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editUserId !== null} onOpenChange={() => setEditUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("userManagement.editDisplayNameTitle")}</DialogTitle>
            <DialogDescription>{t("userManagement.editDisplayNameDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              placeholder={t("userManagement.displayNamePlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserId(null)}>
              {t("userManagement.cancel")}
            </Button>
            <Button
              onClick={handleEditDisplayName}
              disabled={loadingEdit === editUserId}
            >
              {loadingEdit === editUserId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t("userManagement.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteUserId !== null} onOpenChange={() => setDeleteUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("userManagement.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("userManagement.deleteConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserId(null)}>
              {t("userManagement.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={loadingDelete === deleteUserId}
            >
              {loadingDelete === deleteUserId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t("userManagement.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default UserManagementCard;
