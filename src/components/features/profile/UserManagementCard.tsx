// src/components/features/profile/UserManagementCard.tsx
//
// Multi-role admin user management. Reads canonical roles from `public.user_roles`
// (via `admin-user-directory.ts`) and writes them through the multi-role
// Server Actions `setUserRoles` and `createUser`.

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Pencil, Plus, Save, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { acceptPendingUser, declinePendingUser } from "@/lib/actions/onboarding";
import type { UserRole } from "@/lib/auth/types";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import {
  createUser,
  deleteUser,
  setUserRoles,
  triggerPasswordReset,
  updateUserDisplayName,
} from "@/lib/services/profile";
import { formatDateDistance, safeDisplay } from "@/lib/utils/data-format";
import type { PendingUser } from "@/types/database.types";
import { RoleMultiSelect } from "./RoleMultiSelect";

type AdminUserRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  roles: UserRole[];
  created_at: string | null;
  updated_at: string | null;
  last_sign_in_at: string | null;
};

interface UserManagementCardProps {
  allUsers: AdminUserRow[];
  pendingUsers: PendingUser[];
  currentUserId: string;
}

function rolesEqual(a: readonly UserRole[], b: readonly UserRole[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((role, i) => role === sortedB[i]);
}

function UserManagementCard({
  allUsers,
  pendingUsers,
  currentUserId,
}: UserManagementCardProps) {
  const t = useT("settings");
  const localeTag = useNumberLocaleTag();
  const [loadingRoles, setLoadingRoles] = useState<string | null>(null);
  const [loadingReset, setLoadingReset] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createRoles, setCreateRoles] = useState<UserRole[]>(["user"]);
  const [rolesDraftByUser, setRolesDraftByUser] = useState<
    Record<string, UserRole[]>
  >({});
  const [pendingRolesById, setPendingRolesById] = useState<
    Record<string, UserRole[]>
  >({});
  const [loadingPendingAction, setLoadingPendingAction] = useState<
    string | null
  >(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const rolesForRow = (user: AdminUserRow): UserRole[] =>
    rolesDraftByUser[user.id] ?? user.roles;

  const rolesForPending = (pendingId: string): UserRole[] =>
    pendingRolesById[pendingId] ?? ["user"];

  const handleSaveRoles = async (user: AdminUserRow) => {
    const nextRoles = rolesForRow(user);
    if (nextRoles.length === 0) {
      toast.error(t("userManagement.toastRolesEmpty"));
      return;
    }
    setLoadingRoles(user.id);
    try {
      const formData = new FormData();
      formData.append("userId", user.id);
      formData.append("roles", JSON.stringify(nextRoles));
      await setUserRoles(formData);
      toast.success(t("userManagement.toastRoleUpdated"));
      setRolesDraftByUser((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
      queryClient.invalidateQueries();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("userManagement.toastRoleUpdateFailed");
      toast.error(message);
    } finally {
      setLoadingRoles(null);
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
      formData.append("userId", editUserId);
      formData.append("display_name", editDisplayName);
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
    if (createRoles.length === 0) {
      toast.error(t("userManagement.toastRolesEmpty"));
      return;
    }
    setLoadingCreate(true);
    try {
      const formData = new FormData();
      formData.append("email", createEmail);
      formData.append("display_name", createDisplayName);
      formData.append("roles", JSON.stringify(createRoles));
      await createUser(formData);
      toast.success(t("userManagement.toastUserCreated"));
      setCreateDialogOpen(false);
      setCreateEmail("");
      setCreateDisplayName("");
      setCreateRoles(["user"]);
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
    const chosenRoles = rolesForPending(pendingId);
    if (chosenRoles.length === 0) {
      toast.error(t("userManagement.toastRolesEmpty"));
      return;
    }
    setLoadingPendingAction(`accept-${pendingId}`);
    try {
      const formData = new FormData();
      formData.append("pendingId", pendingId);
      formData.append("chosenRoles", JSON.stringify(chosenRoles));
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
      formData.append("userId", deleteUserId);
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
          <Tabs defaultValue="users" className="w-full gap-4">
            <TabsList className="h-auto min-h-9 w-full flex-wrap justify-start gap-1 sm:w-auto sm:flex-nowrap">
              <TabsTrigger value="users" type="button">
                {t("userManagement.usersTab")} ({allUsers.length})
              </TabsTrigger>
              <TabsTrigger value="pending" type="button">
                {t("userManagement.pendingTab")} ({pendingUsers.length})
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
                        <TableHead>{t("userManagement.rolesOnAccept")}</TableHead>
                        <TableHead>{t("userManagement.colActions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUsers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground"
                          >
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
                                ? new Date(p.requested_at).toLocaleString(
                                    localeTag,
                                  )
                                : t("userManagement.notAvailable")}
                            </TableCell>
                            <TableCell>
                              <RoleMultiSelect
                                value={rolesForPending(p.id)}
                                onChange={(next) =>
                                  setPendingRolesById((prev) => ({
                                    ...prev,
                                    [p.id]: next,
                                  }))
                                }
                                ariaLabel={t("userManagement.rolesOnAccept")}
                                size="sm"
                                disabled={
                                  p.status !== "pending_review" ||
                                  loadingPendingAction !== null
                                }
                              />
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
                <div className="overflow-x-auto rounded-md border">
                  <Table className="min-w-[980px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 z-20 bg-card">
                          {t("userManagement.colDisplayName")}
                        </TableHead>
                        <TableHead>{t("userManagement.colEmail")}</TableHead>
                        <TableHead>{t("userManagement.colRoles")}</TableHead>
                        <TableHead>{t("userManagement.colCreatedAt")}</TableHead>
                        <TableHead>{t("userManagement.colUpdatedAt")}</TableHead>
                        <TableHead>{t("userManagement.colLastSignIn")}</TableHead>
                        <TableHead>{t("userManagement.colActions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((u) => {
                        const isSelf = u.id === currentUserId;
                        const draftRoles = rolesForRow(u);
                        const isDirty = !rolesEqual(draftRoles, u.roles);
                        const rowDisplayName =
                          u.display_name ?? t("userManagement.noDisplayName");
                        return (
                          <TableRow key={u.id} className="group align-top">
                            <TableCell className="sticky left-0 z-10 bg-card font-medium group-hover:bg-muted/30">
                              {rowDisplayName}
                            </TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <div className="flex min-w-[18rem] flex-col gap-2 rounded-lg border bg-muted/20 p-3">
                                <p className="text-xs font-medium text-muted-foreground">
                                  {rowDisplayName}
                                </p>
                                <RoleMultiSelect
                                  value={draftRoles}
                                  onChange={(next) =>
                                    setRolesDraftByUser((prev) => ({
                                      ...prev,
                                      [u.id]: next,
                                    }))
                                  }
                                  disabled={loadingRoles === u.id}
                                  pinnedRole={isSelf ? "admin" : undefined}
                                  ariaLabel={t("userManagement.rolesGroupAria")}
                                  layout="block"
                                  size="sm"
                                />
                                {isDirty ? (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    type="button"
                                    onClick={() => void handleSaveRoles(u)}
                                    disabled={loadingRoles === u.id}
                                    className="w-fit"
                                  >
                                    {loadingRoles === u.id ? (
                                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Save className="mr-1 h-3.5 w-3.5" />
                                    )}
                                    {t("userManagement.saveRoles")}
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              {u.created_at
                                ? new Date(u.created_at).toLocaleDateString(
                                    localeTag,
                                  )
                                : t("userManagement.notAvailable")}
                            </TableCell>
                            <TableCell>
                              {u.updated_at
                                ? new Date(u.updated_at).toLocaleDateString(
                                    localeTag,
                                  )
                                : t("userManagement.notAvailable")}
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
                                    ? new Date(u.last_sign_in_at).toLocaleString(
                                        localeTag,
                                        {
                                          dateStyle: "medium",
                                          timeStyle: "short",
                                        },
                                      )
                                    : safeDisplay(u.last_sign_in_at)}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditUserId(u.id);
                                    setEditDisplayName(u.display_name || "");
                                  }}
                                  disabled={loadingEdit === u.id}
                                >
                                  <Pencil className="h-4 w-4" />
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
                                    <Mail className="mr-1 h-4 w-4" />
                                  )}
                                  {t("userManagement.resetPassword")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setDeleteUserId(u.id)}
                                  disabled={loadingDelete === u.id || isSelf}
                                  title={
                                    isSelf
                                      ? t("userManagement.cannotDeleteSelf")
                                      : undefined
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
            <DialogDescription>
              {t("userManagement.createDialogDescription")}
            </DialogDescription>
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
            <div className="space-y-1.5">
              <p className="text-sm font-medium">
                {t("userManagement.createRolesLabel")}
              </p>
              <RoleMultiSelect
                value={createRoles}
                onChange={setCreateRoles}
                ariaLabel={t("userManagement.createRolesLabel")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t("userManagement.cancel")}
            </Button>
            <Button onClick={handleCreateUser} disabled={loadingCreate}>
              {loadingCreate ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("userManagement.createUser")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editUserId !== null}
        onOpenChange={() => setEditUserId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("userManagement.editDisplayNameTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("userManagement.editDisplayNameDescription")}
            </DialogDescription>
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("userManagement.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteUserId !== null}
        onOpenChange={() => setDeleteUserId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("userManagement.deleteConfirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("userManagement.deleteConfirmDescription")}
            </DialogDescription>
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
