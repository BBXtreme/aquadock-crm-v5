<TimelineEntryForm
  onSubmit={async (values) => {
    if (editEntry?.id) {
      await updateMutation.mutateAsync({ id: editEntry.id, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  }}
  isSubmitting={createMutation.isPending || updateMutation.isPending}
  companies={companies}
  contacts={contacts}
  editEntry={editEntry}
  onCancel={() => {
    setDialogOpen(false);
    setEditEntry(null);
  }}
/>;
