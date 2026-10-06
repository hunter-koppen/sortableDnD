## SortableDnD

Drag items between and within lists in Mendix — for example cards between kanban lanes — while the lists
themselves stay ordinary Mendix widgets (galleries, list views) that keep loading, paging and filtering their own data.
The widget only adds dragging and dropping; on drop it calls your action with what was dropped where.

## Features

- One widget, two roles: **Item** (draggable) and **Zone** (drop target).
- **Attach to (CSS selector):** instead of wrapping content, attach to the closest ancestor that matches a selector
  (e.g. `.kbn-card`, `.kbn-lane`). Adds drag and drop to an existing page without moving any widgets.
- **Groups:** items only drop into zones with the same group name.
- While dragging, the dragged item leaves its list and the other items slide aside to open a gap where it will
  land (vertical or horizontal lists), plus auto-scroll of scrollable lists/boards.
- Works across widget instances: an item in one gallery item can be dropped on a zone in another.
- Native HTML5 drag and drop, no runtime dependencies.

## Usage

1. Put a **Zone** in (or around) each list, e.g. in the template of a gallery of lanes.
    - *Zone key*: identifies the zone, e.g. `toString($currentObject/StatusID)`.
    - *On drop*: a microflow/nanoflow. Map the action variables to its parameters:
        - `draggedKey` — item key of the dragged item
        - `fromZoneKey` — zone key it came from (empty when it was not in a zone)
        - `beforeKey` — item key it was dropped in front of (empty = at the end)
        - `newIndex` — 0-based position among the items currently shown in the zone, without the dragged item
2. Put an **Item** in each list item, e.g. in the gallery's item template.
    - *Item key*: unique key, e.g. `toString($currentObject/ID)`. Your drop action looks the object up by this key —
      apply entity access in that action (or scope the retrieve), since the key comes from the browser.
3. Give items and zones the same **Group**.
4. Optional: set *Attach to* on both (e.g. `.my-card` / `.my-lane`) to leave the existing content where it is.

Styling hooks: `.sortablednd-item`, `.sortablednd-dragging`, `.sortablednd-collapsed` (the hidden place of the
dragged item), `.sortablednd-zone.sortablednd-over`, and the gap: `.sortablednd-insert-before` /
`.sortablednd-insert-after` on an item, `.sortablednd-insert-end` on an empty zone; its size is in
`--sortablednd-space`. The dragged item's place only closes completely when its list is a flex/grid container;
otherwise its (empty) list entry stays behind.

Limitations: mouse/trackpad only (HTML5 drag and drop has no touch support in most browsers); no keyboard dragging.

## Development

1. `npm install`
2. `npm run build` bundles the widget and copies the `.mpk` into the Mendix project's `widgets` folder
   (`config.projectPath` in `package.json`). `npm start` does the same on every change.
3. `npm run lint` before committing.
