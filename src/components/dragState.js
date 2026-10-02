// Shared state for all SortableDnD instances on the page. The widget module is loaded once,
// so items and zones in different list items (e.g. different kanban lanes) see the same drag.

export const CLASS = {
    item: "sortablednd-item",
    zone: "sortablednd-zone",
    dragging: "sortablednd-dragging",
    over: "sortablednd-over",
    insertBefore: "sortablednd-insert-before",
    insertEnd: "sortablednd-insert-end"
};

let activeDrag = null; // { key, group, fromZoneKey, element }

export function getActiveDrag() {
    return activeDrag;
}

export function startDrag(drag) {
    activeDrag = drag;
    startAutoScroll();
}

export function endDrag() {
    if (activeDrag && activeDrag.element) {
        activeDrag.element.classList.remove(CLASS.dragging);
    }
    activeDrag = null;
    clearIndicators();
    stopAutoScroll();
}

// --- Drop indicator ----------------------------------------------------------------------------
// Only touch the DOM when the indicated position changes: dragover fires many times per second and
// every class change forces the browser to restyle the (large) page.

let indicator = { zone: null, before: null };

export function showIndicator(zone, before) {
    if (indicator.zone === zone && indicator.before === before) {
        return;
    }
    clearIndicators();
    zone.classList.add(CLASS.over);
    if (before) {
        before.classList.add(CLASS.insertBefore);
    } else {
        zone.classList.add(CLASS.insertEnd);
    }
    indicator = { zone, before };
}

export function clearIndicators(onlyZone) {
    const { zone, before } = indicator;
    if (!zone || (onlyZone && zone !== onlyZone)) {
        return;
    }
    zone.classList.remove(CLASS.over, CLASS.insertEnd);
    if (before) {
        before.classList.remove(CLASS.insertBefore);
    }
    indicator = { zone: null, before: null };
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
