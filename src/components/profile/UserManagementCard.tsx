// src/components/profile/UserManagementCard.tsx
// Client Component for User Management
// This component displays a table of all users (only visible to admins) and allows the admin to change user roles, trigger password resets, and delete users.
// It uses buttons with loading states for each action and includes a confirmation dialog for deletions.

"use client";

import { Loader2, Mail, Shield, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { changeUserRole, deleteUser, triggerPasswordReset } from "@/lib/services/profile";
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
    last_sign_in_at: string | null;
  }[];
}) {
  const t = useT("settings");
  const localeTag = useNumberLocaleTag();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [loadingReset, setLoadingReset] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setLoadingRole(userId);
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('newRole', newRole);
      await changeUserRole(formData);
      toast.success(t("userManagement.toastRoleUpdated"));
      window.location.reload();
    } catch (_error) {
      toast.error(t("userManagement.toastRoleUpdateFailed"));
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
      toast.success(t("userManagement.toastResetEmailSent"));
    } catch (_error) {
      toast.error(t("userManagement.toastResetEmailFailed"));
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
      toast.success(t("userManagement.toastUserDeleted"));
      setDeleteUserId(null);
      window.location.reload();
    } catch (_error) {
      toast.error(t("userManagement.toastUserDeleteFailed"));
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
            {t("userManagement.cardTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("userManagement.colName")}</TableHead>
                    <TableHead>{t("userManagement.colEmail")}</TableHead>
                    <TableHead>{t("userManagement.colRole")}</TableHead>
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
                          <Trash2 className="h-4 w-4 mr-1" />
                          {t("userManagement.delete")}
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

      <Dialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
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
