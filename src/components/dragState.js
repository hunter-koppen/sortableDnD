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

export function clearIndicators() {
    document.querySelectorAll(`.${CLASS.insertBefore}`).forEach(el => el.classList.remove(CLASS.insertBefore));
    document
        .querySelectorAll(`.${CLASS.over}, .${CLASS.insertEnd}`)
        .forEach(el => el.classList.remove(CLASS.over, CLASS.insertEnd));
}

// --- Auto-scroll -------------------------------------------------------------------------------
// While dragging, scroll any scrollable ancestor (a lane, the board) when the pointer is near its edge,
// so items can be dropped in lanes or positions that are currently out of view.

const EDGE_PX = 48;
const MAX_SPEED_PX = 18;

let pointer = null;
let frame = 0;

function onDocumentDragOver(e) {
    pointer = { x: e.clientX, y: e.clientY, target: e.target };
}

function speed(distanceToEdge) {
    return Math.ceil(MAX_SPEED_PX * (1 - Math.max(distanceToEdge, 0) / EDGE_PX));
}

function isScrollable(el, axis) {
    const style = window.getComputedStyle(el);
    const overflow = axis === "y" ? style.overflowY : style.overflowX;
    if (overflow !== "auto" && overflow !== "scroll") {
        return false;
    }
    return axis === "y" ? el.scrollHeight > el.clientHeight : el.scrollWidth > el.clientWidth;
}

function tick() {
    if (pointer && pointer.target instanceof Element) {
        let scrolledX = false;
        let scrolledY = false;
        for (let el = pointer.target; el && el !== document.body && !(scrolledX && scrolledY); el = el.parentElement) {
            const rect = el.getBoundingClientRect();
            if (!scrolledY && isScrollable(el, "y")) {
                if (pointer.y < rect.top + EDGE_PX) {
                    el.scrollTop -= speed(pointer.y - rect.top);
                    scrolledY = true;
                } else if (pointer.y > rect.bottom - EDGE_PX) {
                    el.scrollTop += speed(rect.bottom - pointer.y);
                    scrolledY = true;
                }
            }
            if (!scrolledX && isScrollable(el, "x")) {
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
