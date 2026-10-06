// The element a SortableDnD instance attaches to is a DOM node outside React's control
// (with 'Attach to' it is not even rendered by this widget), so its attributes are written here.

export function setDataAttributes(element, values) {
    Object.entries(values).forEach(([name, value]) => {
        if (value === undefined) {
            delete element.dataset[name];
        } else {
            element.dataset[name] = value;
        }
    });
}

export function setDraggable(element, draggable) {
    if (draggable === undefined) {
        element.removeAttribute("draggable");
    } else {
        element.setAttribute("draggable", draggable ? "true" : "false");
    }
}

function isLayoutContainer(el) {
    const display = window.getComputedStyle(el).display;
    return display.includes("flex") || display.includes("grid");
}

/** The nearest flex/grid ancestor of `item` and the child of it that contains `item` (the list entry). */
export function listEntryOf(item) {
    for (let child = item, parent = item.parentElement; parent; child = parent, parent = parent.parentElement) {
        if (isLayoutContainer(parent)) {
            return { container: parent, entry: child };
        }
    }
    return null;
}

/**
 * The box that holds the item's place in its list: the list entry around it (e.g. a gallery item) when that list
 * lies within the zone, else the item itself. Hiding this box closes the item's place without leaving an empty
 * entry and its spacing behind.
 */
export function slotOf(item, zone) {
    const found = zone ? listEntryOf(item) : null;
    return found && zone.contains(found.container) ? found.entry : item;
}

/** The room a slot takes in its list: its size plus the spacing to its neighbour. */
export function slotSize(slot) {
    const rect = slot.getBoundingClientRect();
    const next = slot.nextElementSibling;
    const previous = slot.previousElementSibling;
    let gapX = 0;
    let gapY = 0;
    if (next) {
        const other = next.getBoundingClientRect();
        gapX = other.left - rect.right;
        gapY = other.top - rect.bottom;
    } else if (previous) {
        const other = previous.getBoundingClientRect();
        gapX = rect.left - other.right;
        gapY = rect.top - other.bottom;
    }
    return { width: rect.width + Math.max(gapX, 0), height: rect.height + Math.max(gapY, 0) };
}
