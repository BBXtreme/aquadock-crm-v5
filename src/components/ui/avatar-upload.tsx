"use client";

import { Check, Loader2, Pencil } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { ZodError } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateProfileAvatar } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { safeDisplay } from "@/lib/utils/data-format";
import {
  PROFILE_AVATAR_MAX_BYTES,
  parseProfileAvatarFile,
  resolveProfileAvatarMime,
} from "@/lib/validations/profile";

const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif";

const PLACEHOLDER_AVATAR_SRC = "/placeholder-avatar.png";

function sanitizeAvatarFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, "");
  const cleaned = base.replace(/[^a-zA-Z0-9.-]/g, "");
  const trimmed = cleaned.slice(0, 80);
  return trimmed.length > 0 ? trimmed : "image";
}

function initialsFromDisplayName(displayName: string): string {
  const trimmed = displayName.trim();
  if (trimmed.length === 0) {
    return "?";
  }
  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0);
  if (parts.length >= 2) {
    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];
    if (firstPart !== undefined && lastPart !== undefined) {
      return `${firstPart.charAt(0)}${lastPart.charAt(0)}`.toUpperCase();
    }
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function gifFirstFrameToPngBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx === null) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas nicht verfügbar"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob !== null) {
              resolve(blob);
            } else {
              reject(new Error("Konvertierung fehlgeschlagen"));
            }
          },
          "image/png",
          0.92,
        );
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht geladen werden"));
    };
    img.src = url;
  });
}

async function prepareUploadBlob(file: File): Promise<{ blob: Blob; contentType: string }> {
  const lower = file.name.toLowerCase();
  const isGif = file.type === "image/gif" || lower.endsWith(".gif");
  if (isGif) {
    const png = await gifFirstFrameToPngBlob(file);
    return { blob: png, contentType: "image/png" };
  }
  return { blob: file, contentType: resolveProfileAvatarMime(file) };
}

function storageObjectNameForUpload(file: File, userId: string): string {
  const lower = file.name.toLowerCase();
  const isGif = file.type === "image/gif" || lower.endsWith(".gif");
  const logicalName = isGif ? file.name.replace(/\.gif$/i, ".png") : file.name;
  const sanitized = sanitizeAvatarFilename(logicalName);
  return `${userId}-${Date.now()}-${sanitized}`;
}

type AvatarUploadProps = {
  userId: string;
  displayName: string;
  initialAvatarUrl: string | null;
};

export function AvatarUpload({ userId, displayName, initialAvatarUrl }: AvatarUploadProps) {
  const router = useRouter();
  const inputId = useId();
  const dropZoneRef = useRef<HTMLElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [justSucceeded, setJustSucceeded] = useState(false);

  useEffect(() => {
    setAvatarUrl(initialAvatarUrl ?? null);
  }, [initialAvatarUrl]);

  useEffect(() => {
    return () => {
      if (previewObjectUrl !== null) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    };
  }, [previewObjectUrl]);

  const displayLabel = safeDisplay(displayName, "");
  const initials = initialsFromDisplayName(displayLabel);
  const avatarDisplaySrc =
    avatarUrl !== null && avatarUrl.length > 0 ? avatarUrl : PLACEHOLDER_AVATAR_SRC;

  const resetPreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewObjectUrl((prev) => {
      if (prev !== null) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setPendingFile(null);
  }, []);

  const handleChosenFile = useCallback((file: File) => {
    try {
      parseProfileAvatarFile(file);
    } catch (e) {
      if (e instanceof ZodError) {
        const msg = e.issues[0]?.message ?? "Nur Bilddateien erlaubt";
        toast.error(msg);
        return;
      }
      toast.error("Nur Bilddateien erlaubt");
      return;
    }

    setPreviewObjectUrl((prev) => {
      if (prev !== null) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
    setPendingFile(file);
    setPreviewOpen(true);
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file === undefined) {
        return;
      }
      handleChosenFile(file);
    },
    [handleChosenFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file === undefined) {
        return;
      }
      handleChosenFile(file);
    },
    [handleChosenFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    const next = e.relatedTarget;
    if (
      dropZoneRef.current !== null &&
      next instanceof Node &&
      !dropZoneRef.current.contains(next)
    ) {
      setIsDragging(false);
    }
  }, []);

  const confirmUpload = useCallback(async () => {
    if (pendingFile === null) {
      return;
    }
    setUploading(true);
    try {
      const { blob, contentType } = await prepareUploadBlob(pendingFile);
      const objectName = storageObjectNameForUpload(pendingFile, userId);
      const path = `${userId}/${objectName}`;

      const supabase = createClient();
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, {
        upsert: true,
        contentType,
      });

      if (upErr !== null) {
        if (upErr.message === "Bucket not found" || upErr.message.includes("Bucket not found")) {
          toast.error(
            "Speicher-Bucket „avatars“ fehlt. Bitte in Supabase anlegen (öffentlich) – siehe src/sql/storage-avatars-bucket.sql.",
          );
        } else {
          toast.error("Upload fehlgeschlagen – bitte versuchen Sie es erneut");
        }
        return;
      }

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const result = await updateProfileAvatar({ avatar_url: publicUrl });
      setAvatarUrl(result.avatar_url);
      toast.success("Profilbild wurde aktualisiert");
      setJustSucceeded(true);
      window.setTimeout(() => setJustSucceeded(false), 2000);
      setPreviewOpen(false);
      resetPreview();
      router.refresh();
    } catch {
      toast.error("Upload fehlgeschlagen – bitte versuchen Sie es erneut");
    } finally {
      setUploading(false);
    }
  }, [pendingFile, resetPreview, router, userId]);

  const handleRemove = useCallback(async () => {
    setRemoving(true);
    try {
      const result = await updateProfileAvatar({ avatar_url: null });
      setAvatarUrl(result.avatar_url);
      toast.success("Profilbild wurde aktualisiert");
      router.refresh();
    } catch {
      toast.error("Upload fehlgeschlagen – bitte versuchen Sie es erneut");
    } finally {
      setRemoving(false);
    }
  }, [router]);

  const cancelPreview = useCallback(() => {
    resetPreview();
  }, [resetPreview]);

  return (
    <section
      ref={dropZoneRef}
      aria-label="Profilbild per Drag-and-Drop oder Dateiauswahl hochladen"
      className={cn(
        "flex w-full flex-col items-center gap-4 rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 transition-colors",
        isDragging && "border-primary/50 bg-primary/5",
      )}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <input
        id={inputId}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        aria-label="Profilbild auswählen"
        onChange={onInputChange}
      />

      <div className="relative">
        <div
          className={cn(
            "relative rounded-full ring-2 ring-border/40 ring-offset-2 ring-offset-background transition-shadow",
            uploading && "ring-primary/30",
          )}
        >
          <Avatar
            className={cn(
              "h-32 w-32 border-4 border-primary/10 shadow-sm",
              uploading && "opacity-70",
            )}
          >
            <AvatarImage src={avatarDisplaySrc} alt={safeDisplay(displayLabel, "Profilbild")} />
            <AvatarFallback
              className={cn(
                "text-2xl font-semibold text-primary-foreground",
                "bg-gradient-to-br from-primary/90 via-primary/70 to-primary/50",
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>

          {uploading ? (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 backdrop-blur-[2px]"
              aria-live="polite"
              aria-busy="true"
            >
              <span className="relative flex h-14 w-14 items-center justify-center">
                <span className="absolute inset-0 rounded-full border-2 border-muted border-t-primary animate-spin" />
                <Loader2 className="relative h-7 w-7 text-primary" aria-hidden />
              </span>
            </div>
          ) : null}

          {justSucceeded && !uploading ? (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-full bg-emerald-600/85 text-white backdrop-blur-[1px]"
              aria-hidden
            >
              <Check className="h-10 w-10" strokeWidth={2.5} />
            </div>
          ) : null}
        </div>

        <label
          htmlFor={inputId}
          className={cn(
            "absolute inset-0 flex cursor-pointer items-center justify-center rounded-full",
            "bg-foreground/0 opacity-0 transition-all duration-200",
            "hover:bg-foreground/40 hover:opacity-100",
            "focus-within:opacity-100 focus-within:bg-foreground/40",
            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
          )}
        >
          <span className="pointer-events-none flex flex-col items-center gap-1 text-center text-primary-foreground drop-shadow-sm">
            <Pencil className="h-6 w-6" aria-hidden />
            <span className="max-w-[8rem] text-xs font-medium leading-tight">Profilbild ändern</span>
          </span>
        </label>
      </div>

      <p className="text-center text-muted-foreground text-xs">
        Bild hierher ziehen · JPG, PNG, WEBP, GIF · max.{" "}
        {Math.round(PROFILE_AVATAR_MAX_BYTES / (1024 * 1024))} MB
      </p>

      {avatarUrl !== null && avatarUrl.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={handleRemove}
          disabled={removing || uploading}
          aria-busy={removing}
        >
          {removing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Wird entfernt…
            </>
          ) : (
            "Profilbild entfernen"
          )}
        </Button>
      ) : null}

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (!open) {
            cancelPreview();
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Vorschau</DialogTitle>
            <DialogDescription>
              So wird Ihr Profilbild angezeigt. Bestätigen Sie den Upload oder brechen Sie ab.
            </DialogDescription>
          </DialogHeader>
          {previewObjectUrl !== null ? (
            <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-lg border border-border bg-muted">
              <Image
                src={previewObjectUrl}
                alt="Vorschau Profilbild"
                fill
                className="object-cover"
                sizes="280px"
                unoptimized
              />
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={cancelPreview} disabled={uploading}>
              Abbrechen
            </Button>
            <Button type="button" onClick={confirmUpload} disabled={uploading || pendingFile === null}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Wird hochgeladen…
                </>
              ) : (
                "Hochladen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
