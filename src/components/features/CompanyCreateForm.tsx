"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCompany } from "@/hooks/useCompanyMutations";

interface CompanyCreateFormProps {
  onSuccess?: () => void;
}

export function CompanyCreateForm({ onSuccess }: CompanyCreateFormProps) {
  const [formData, setFormData] = useState({
    firmenname: "",
    kundentyp: "sonstige",
    status: "lead",
    value: 0,
  });

  const { mutate: createCompany, isPending: isCreating } = useCreateCompany();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCompany(formData, {
      onSuccess: () => {
        setFormData({
          firmenname: "",
          kundentyp: "sonstige",
          status: "lead",
          value: 0,
        });
        onSuccess?.();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="firmenname">Firmenname</Label>
        <Input
          id="firmenname"
          value={formData.firmenname}
          onChange={(e) => setFormData({ ...formData, firmenname: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="kundentyp">Kundentyp</Label>
        <Select
          value={formData.kundentyp}
          onValueChange={(value) => setFormData({ ...formData, kundentyp: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="restaurant">Restaurant</SelectItem>
            <SelectItem value="hotel">Hotel</SelectItem>
            <SelectItem value="marina">Marina</SelectItem>
            <SelectItem value="camping">Camping</SelectItem>
            <SelectItem value="sonstige">Sonstige</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="qualifiziert">Qualifiziert</SelectItem>
            <SelectItem value="akquise">Akquise</SelectItem>
            <SelectItem value="angebot">Angebot</SelectItem>
            <SelectItem value="gewonnen">Gewonnen</SelectItem>
            <SelectItem value="verloren">Verloren</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="value">Value (€)</Label>
        <Input
          id="value"
          type="number"
          value={formData.value}
          onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
        />
      </div>
      <Button type="submit" disabled={isCreating}>
        {isCreating ? "Creating..." : "Create"}
      </Button>
    </form>
  );
}
