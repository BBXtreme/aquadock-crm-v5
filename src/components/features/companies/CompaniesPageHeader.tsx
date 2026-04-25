"use client";

import { Plus } from "lucide-react";

import CompanyCreateForm from "@/components/features/companies/CompanyCreateForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WideDialogContent } from "@/components/ui/wide-dialog";

type CompaniesPageHeaderProps = {
  breadcrumb: string;
  title: string;
  subtitle: string;
  createButtonLabel: string;
  createDialogTitle: string;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  onCreateSuccess: () => void;
};

export function CompaniesPageHeader({
  breadcrumb,
  title,
  subtitle,
  createButtonLabel,
  createDialogTitle,
  dialogOpen,
  onDialogOpenChange,
  onCreateSuccess,
}: CompaniesPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">{breadcrumb}</div>
        <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {title}
        </h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {createButtonLabel}
          </Button>
        </DialogTrigger>
        <WideDialogContent size="2xl">
          <DialogHeader>
            <DialogTitle>{createDialogTitle}</DialogTitle>
          </DialogHeader>
          <CompanyCreateForm onSuccess={onCreateSuccess} />
        </WideDialogContent>
      </Dialog>
    </div>
  );
}
