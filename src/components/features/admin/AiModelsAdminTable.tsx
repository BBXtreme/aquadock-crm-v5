"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  type AiAvailableModelRow,
  createAiModelAction,
  deleteAiModelAction,
  listAiModelsAction,
  updateAiModelAction,
} from "@/lib/actions/ai-models";
import type { aiModelInsertSchema } from "@/lib/validations/ai-model";

type ModelForm = z.infer<typeof aiModelInsertSchema>;

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">Noch keine Modelle registriert</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Füge dein erstes KI-Modell hinzu, damit es in der KI-Anreicherung für alle Benutzer zur Verfügung steht.
      </p>
      <Button onClick={onCreate} className="mt-6" size="sm">
        <Plus className="mr-2 h-4 w-4" /> Erstes Modell hinzufügen
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((n) => (
        <div key={`skeleton-${n}`} className="flex items-center gap-4 rounded-lg border p-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AiModelsAdminTable() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AiAvailableModelRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"label" | "quality" | "speed" | "cost">("label");

  const form = useForm<ModelForm>({
    defaultValues: {
      gateway_id: "",
      label: "",
      provider: "",
      quality_score: 3,
      speed_tier: "medium",
      cost_tier: "medium",
      badge_text: null,
      badge_variant: null,
      is_enabled: true,
    },
  });

  const { data: models = [], isLoading } = useQuery({
    queryKey: ["ai-models"],
    queryFn: () => listAiModelsAction(),
  });

  const filteredAndSorted = useMemo(() => {
    let result = [...models];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.label.toLowerCase().includes(term) ||
          m.provider.toLowerCase().includes(term) ||
          m.gateway_id.toLowerCase().includes(term),
      );
    }

    result.sort((a, b) => {
      if (sortBy === "label") return a.label.localeCompare(b.label);
      if (sortBy === "quality") return b.quality_score - a.quality_score;
      if (sortBy === "speed") {
        const order = { high: 3, medium: 2, low: 1 };
        return order[b.speed_tier] - order[a.speed_tier];
      }
      const order = { high: 3, medium: 2, low: 1 };
      return order[b.cost_tier] - order[a.cost_tier];
    });

    return result;
  }, [models, searchTerm, sortBy]);

  const createMutation = useMutation({
    mutationFn: (input: unknown) => createAiModelAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-models"] });
      toast.success("Modell erfolgreich hinzugefügt");
      setDialogOpen(false);
      setEditingModel(null);
      form.reset();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Erstellen fehlgeschlagen";
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: unknown }) => updateAiModelAction(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-models"] });
      toast.success("Modell aktualisiert");
      setDialogOpen(false);
      setEditingModel(null);
      form.reset();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Aktualisierung fehlgeschlagen";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAiModelAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-models"] });
      toast.success("Modell gelöscht");
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Löschen fehlgeschlagen";
      toast.error(message);
    },
  });

  function onSubmit(values: ModelForm) {
    const payload = {
      ...values,
      badge_text: values.badge_text || null,
      badge_variant: values.badge_text ? values.badge_variant : null,
    };

    if (editingModel) {
      updateMutation.mutate({
        id: editingModel.id,
        patch: payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  }

  function toggleEnabled(model: AiAvailableModelRow) {
    updateMutation.mutate({
      id: model.id,
      patch: { is_enabled: !model.is_enabled },
    });
  }

  function openCreate() {
    setEditingModel(null);
    form.reset({
      gateway_id: "",
      label: "",
      provider: "",
      quality_score: 3,
      speed_tier: "medium",
      cost_tier: "medium",
      badge_text: null,
      badge_variant: null,
      is_enabled: true,
    });
    setDialogOpen(true);
  }

  function openEdit(model: AiAvailableModelRow) {
    setEditingModel(model);
    form.reset({
      gateway_id: model.gateway_id,
      label: model.label,
      provider: model.provider,
      quality_score: model.quality_score,
      speed_tier: model.speed_tier,
      cost_tier: model.cost_tier,
      badge_text: model.badge_text,
      badge_variant: model.badge_variant,
      is_enabled: model.is_enabled,
    });
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Modelle durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "label" | "quality" | "speed" | "cost")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sortieren nach" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="label">Name (A–Z)</SelectItem>
              <SelectItem value="quality">Qualität (hoch → niedrig)</SelectItem>
              <SelectItem value="speed">Geschwindigkeit</SelectItem>
              <SelectItem value="cost">Kosten</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Modell hinzufügen
        </Button>
      </div>

      {/* Table / States */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : filteredAndSorted.length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">Modell</th>
                  <th className="px-6 py-3">Provider</th>
                  <th className="px-6 py-3 text-center">Qualität</th>
                  <th className="px-6 py-3 text-center">Speed</th>
                  <th className="px-6 py-3 text-center">Kosten</th>
                  <th className="px-6 py-3">Badge</th>
                  <th className="px-6 py-3 text-center">Aktiv</th>
                  <th className="px-6 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAndSorted.map((model) => (
                  <tr key={model.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium">{model.label}</td>
                    <td className="px-6 py-4 text-muted-foreground">{model.provider}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-xs">
                          {model.quality_score}/5
                        </Badge>
                        {model.deprecated && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            Deprecated
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-muted-foreground">
                      {model.speed_tier}
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-muted-foreground">
                      {model.cost_tier}
                    </td>
                    <td className="px-6 py-4">
                      {model.badge_text ? (
                        <Badge variant={model.badge_variant ?? "outline"} className="text-xs">
                          {model.badge_text}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={model.is_enabled}
                        onCheckedChange={() => toggleEnabled(model)}
                        disabled={updateMutation.isPending}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(model)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(model.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingModel(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingModel ? "KI-Modell bearbeiten" : "Neues KI-Modell hinzufügen"}
            </DialogTitle>
            <DialogDescription>
              {editingModel?.deprecated && (
                <span className="font-medium text-destructive">
                  ⚠️ Dieses Modell ist veraltet und wird am 15. Mai 2026 entfernt.
                </span>
              )}
              {editingModel
                ? " Änderungen werden sofort in allen KI-Anreicherungs-Selects wirksam."
                : " Das Modell wird sofort in allen KI-Anreicherungs-Selects für alle Benutzer sichtbar."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="gateway_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gateway ID</FormLabel>
                      <FormControl>
                        <Input placeholder="xai/grok-4-custom" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anzeigename</FormLabel>
                      <FormControl>
                        <Input placeholder="Grok 4 Custom" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <FormControl>
                      <Input placeholder="xAI" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="quality_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualität</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} – {n === 5 ? "Höchste" : n === 1 ? "Niedrigste" : "Mittel"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="speed_tier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Geschwindigkeit</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high">Schnell</SelectItem>
                          <SelectItem value="medium">Mittel</SelectItem>
                          <SelectItem value="low">Langsam</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cost_tier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kosten</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Günstig</SelectItem>
                          <SelectItem value="medium">Mittel</SelectItem>
                          <SelectItem value="high">Teuer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="badge_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Badge-Text (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Empfohlen" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormDescription>Wird als farbiges Chip angezeigt</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="badge_variant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Badge-Variante</FormLabel>
                      <Select
                        value={field.value ?? "outline"}
                        onValueChange={(v) => field.onChange(v)}
                        disabled={!form.watch("badge_text")}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="secondary">Secondary</SelectItem>
                          <SelectItem value="outline">Outline</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Live Badge Preview */}
              {form.watch("badge_text") && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Vorschau des Badges</div>
                  <Badge variant={form.watch("badge_variant") ?? "outline"} className="text-xs">
                    {form.watch("badge_text")}
                  </Badge>
                </div>
              )}

              <FormField
                control={form.control}
                name="is_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Sofort aktivieren</FormLabel>
                      <FormDescription>Modell erscheint direkt in allen Selects</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingModel(null);
                  }}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={editingModel ? updateMutation.isPending : createMutation.isPending}
                >
                  {editingModel
                    ? updateMutation.isPending
                      ? "Speichern..."
                      : "Änderungen speichern"
                    : createMutation.isPending
                      ? "Speichern..."
                      : "Modell speichern"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modell wirklich löschen?</DialogTitle>
            <DialogDescription>
              Dieses Modell wird sofort aus allen KI-Anreicherungs-Selects entfernt. Die Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Löschen..." : "Endgültig löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}