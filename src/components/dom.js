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
