# Situations

Workspace → Situations is a private queue of things to explore with patterns later. Add a title,
reorder using the grip handle with mouse or touch, and click the title to open a small notebook.
The handle also accepts up/down arrows for keyboard access. Dragging near the viewport edge
scrolls the page; Escape or a cancelled pointer restores the original order.
Reorder handles and the drag hint appear only when there are multiple situations. Each row has
rename and delete buttons. Rename opens the notebook with its editable title selected; delete
asks for confirmation and removes the situation and its context. A newer edit from another window
prevents deletion until the situation is reopened.

Notebook titles and plain-text context save after a short pause and before closing. Saving failures
keep the notebook and draft visible. Content revisions reject stale writes from another window;
reordering reads the current queue in an IndexedDB transaction and preserves concurrent context
updates and additions. The workspace database upgrades existing installations with a separate
situations table. Portable workspace backups include situations, ordering and context; older files
without situations remain readable. Situations are currently local and included in file backups;
the existing Dropbox sync of articles and Mira conversations does not include this queue.

This first version covers capture, ordering and context. Applying patterns to a situation can build
on stable situation IDs in a later version.
