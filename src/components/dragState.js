// Shared state for all SortableDnD instances on the page. The widget module is loaded once,
// so items and zones in different list items (e.g. different kanban lanes) see the same drag.

export const CLASS = {
    item: "sortablednd-item",
    zone: "sortablednd-zone",
    dragging: "sortablednd-dragging",
    collapsed: "sortablednd-collapsed",
    active: "sortablednd-drag-active",
    over: "sortablednd-over",
    insertBefore: "sortablednd-insert-before",
    insertAfter: "sortablednd-insert-after",
    insertEnd: "sortablednd-insert-end"
};

const SPACE_VAR = "--sortablednd-space";

let activeDrag = null; // { key, group, fromZoneKey, element, zone, slot, size }

export function getActiveDrag() {
    return activeDrag;
}

/**
 * The items that belong directly to `zone` (not to a zone nested inside it), in DOM order,
 * without `dragged`.
 */
export function zoneItems(zone, group, dragged) {
    return Array.from(zone.querySelectorAll(`.${CLASS.item}`)).filter(
        item =>
            item !== dragged &&
            item.dataset.sortableGroup === group &&
            item.dataset.sortableKey &&
            item.parentElement &&
            item.parentElement.closest(`.${CLASS.zone}`) === zone
    );
}

export function startDrag(drag) {
    activeDrag = drag;
    startAutoScroll();
}

/**
 * Called once the browser has captured the drag image: take the dragged item out of its list and open a gap of
 * the same size in its place. Both happen before transitions are switched on, so nothing visibly moves yet; from
 * then on the other items slide aside wherever the item would land.
 */
export function liftDraggedItem(drag) {
    if (drag !== activeDrag) {
        return; // the drag already ended
    }
    drag.element.classList.add(CLASS.dragging);
    drag.slot.classList.add(CLASS.collapsed);
    if (drag.zone) {
        const all = zoneItems(drag.zone, drag.group, null);
        showIndicator(
            drag.zone,
            all.filter(item => item !== drag.element),
            all.indexOf(drag.element)
        );
    }
    document.documentElement.getBoundingClientRect(); // apply the layout above before the transition class
    document.documentElement.classList.add(CLASS.active);
}

export function endDrag() {
    const drag = activeDrag;
    activeDrag = null;
    // Without transitions the gap closes at once, so it does not briefly add to the optimistic copy on a drop.
    document.documentElement.classList.remove(CLASS.active);
    if (drag) {
        drag.element.classList.remove(CLASS.dragging);
        drag.slot.classList.remove(CLASS.collapsed);
    }
    clearIndicators();
    stopAutoScroll();
}

// --- Drop indicator ----------------------------------------------------------------------------
// A gap the size of the dragged item where it will land: a margin before the item it goes in front of, after the
// last item when it goes last, or at the end of an empty zone.
// Only touch the DOM when the indicated position changes: dragover fires many times per second and
// every class change forces the browser to restyle the (large) page.

let indicator = { zone: null, before: null, after: null };

/**
 * @param zone  the zone the item would be dropped in
 * @param items the zone's items in order, without the dragged item
 * @param index the position the dragged item would get within `items`
 */
export function showIndicator(zone, items, index) {
    const before = items[index] || null;
    const after = before ? null : items[items.length - 1] || null;
    if (indicator.zone === zone && indicator.before === before && indicator.after === after) {
        return;
    }
    clearIndicators();
    const size = activeDrag && activeDrag.size;
    if (size) {
        const horizontal = zone.dataset.sortableOrientation === "horizontal";
        zone.style.setProperty(SPACE_VAR, `${horizontal ? size.width : size.height}px`);
    }
    zone.classList.add(CLASS.over);
    if (before) {
        before.classList.add(CLASS.insertBefore);
    } else if (after) {
        after.classList.add(CLASS.insertAfter);
    } else {
        zone.classList.add(CLASS.insertEnd);
    }
    indicator = { zone, before, after };
}

export function clearIndicators(onlyZone) {
    const { zone, before, after } = indicator;
    if (!zone || (onlyZone && zone !== onlyZone)) {
        return;
    }
    zone.classList.remove(CLASS.over, CLASS.insertEnd);
    zone.style.removeProperty(SPACE_VAR);
    if (before) {
        before.classList.remove(CLASS.insertBefore);
    }
    if (after) {
        after.classList.remove(CLASS.insertAfter);
    }
    indicator = { zone: null, before: null, after: null };
}

// --- Auto-scroll -------------------------------------------------------------------------------
// While dragging, scroll any scrollable ancestor (a lane, the board) when the pointer is near its edge,
// so items can be dropped in lanes or positions that are currently out of view.

const EDGE_PX = 48;
const MAX_SPEED_PX = 18;

let pointer = null;
let frame = 0;
let scrollParentsCache = new WeakMap();

function onDocumentDragOver(e) {
    pointer = { x: e.clientX, y: e.clientY, target: e.target };
}

function speed(distanceToEdge) {
    return Math.ceil(MAX_SPEED_PX * (1 - Math.max(distanceToEdge, 0) / EDGE_PX));
}

/** Scrollable ancestors of `target` with the axes they scroll on; styles do not change during a drag. */
function scrollParents(target) {
    let result = scrollParentsCache.get(target);
    if (!result) {
        result = [];
        for (let el = target; el && el !== document.body; el = el.parentElement) {
            const style = window.getComputedStyle(el);
            const y = /(auto|scroll)/.test(style.overflowY);
            const x = /(auto|scroll)/.test(style.overflowX);
            if (x || y) {
                result.push({ el, x, y });
            }
        }
        scrollParentsCache.set(target, result);
    }
    return result;
}

function tick() {
    if (pointer && pointer.target instanceof Element) {
        let scrolledX = false;
        let scrolledY = false;
        for (const { el, x, y } of scrollParents(pointer.target)) {
            if (scrolledX && scrolledY) {
                break;
            }
            const rect = el.getBoundingClientRect();
            if (!scrolledY && y && el.scrollHeight > el.clientHeight) {
                if (pointer.y < rect.top + EDGE_PX) {
                    el.scrollTop -= speed(pointer.y - rect.top);
                    scrolledY = true;
                } else if (pointer.y > rect.bottom - EDGE_PX) {
                    el.scrollTop += speed(rect.bottom - pointer.y);
                    scrolledY = true;
                }
            }
            if (!scrolledX && x && el.scrollWidth > el.clientWidth) {
                if (pointer.x < rect.left + EDGE_PX) {
                    el.scrollLeft -= speed(pointer.x - rect.left);
                    scrolledX = true;
                } else if (pointer.x > rect.right - EDGE_PX) {
                    el.scrollLeft += speed(rect.right - pointer.x);
                    scrolledX = true;
                }
            }
        }
    }
    frame = window.requestAnimationFrame(tick);
}

function startAutoScroll() {
    stopAutoScroll();
    scrollParentsCache = new WeakMap();
    document.addEventListener("dragover", onDocumentDragOver, true);
    frame = window.requestAnimationFrame(tick);
}

function stopAutoScroll() {
    document.removeEventListener("dragover", onDocumentDragOver, true);
    if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
    }
    pointer = null;
}
