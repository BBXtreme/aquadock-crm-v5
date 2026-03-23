        {/* View Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>View Reminder</DialogTitle>
              <DialogDescription>
                Details of the selected reminder.
              </DialogDescription>
            </DialogHeader>
            {selectedReminder && (
              <div className="space-y-4">
                <div>
                  <label className="font-medium">Title:</label>
                  <p>{selectedReminder.title || "—"}</p>
                </div>
                <div>
                  <label className="font-medium">Company:</label>
                  <p>{selectedReminder.companies?.firmenname || "—"}</p>
                </div>
                <div>
                  <label className="font-medium">Due Date:</label>
                  <p>{selectedReminder.due_date ? formatDistanceToNow(new Date(selectedReminder.due_date), { addSuffix: true }) : "—"}</p>
                </div>
                <div>
                  <label className="font-medium">Priority:</label>
                  <p>{selectedReminder.priority || "—"}</p>
                </div>
                <div>
                  <label className="font-medium">Status:</label>
                  <p>{selectedReminder.status || "—"}</p>
                </div>
                <div>
                  <label className="font-medium">Assigned To:</label>
                  <p>{selectedReminder.assigned_to || "—"}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
