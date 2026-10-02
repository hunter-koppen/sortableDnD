// Optimistic move: show the dropped item at its new place right away, before the On drop action has run
// and the lists have reloaded. Only CSS `order` and a temporary copy are used — no node rendered by
// Mendix/React is moved — so the next real render simply takes over. Needs the list container to be a
// flex or grid container (which is what decides whether `order` has any effect).

const MOVED_AWAY = "sortablednd-moved-away";
const PLACEHOLDER = "sortablednd-placeholder";
const TIMEOUT_MS = 8000; // safety net: undo the preview when nothing ever refreshes
const SETTLE_MS = 1500; // after the action finished: the refresh should follow quickly, or nothing changed

let pending = null;

function isLayoutContainer(el) {
    const display = window.getComputedStyle(el).display;
    return display.includes("flex") || display.includes("grid");
}

/** The nearest flex/grid ancestor of `item` and the child of it that contains `item` (the list entry). */
function listEntryOf(item) {
    for (let child = item, parent = item.parentElement; parent; child = parent, parent = parent.parentElement) {
        if (isLayoutContainer(parent)) {
            return { container: parent, entry: child };
        }
    }
    return null;
}

export function clearPendingMove() {
    if (!pending) {
        return;
    }
    const { observers, timer, restore } = pending;
    pending = null;
    observers.forEach(observer => observer.disconnect());
    window.clearTimeout(timer);
    restore.forEach(fn => fn());
}

/**
 * @param dragged     the dragged item element
 * @param targetItems the items of the target zone in order, without the dragged item
 * @param index       the position the dragged item goes to within targetItems
 */
export function applyOptimisticMove(dragged, targetItems, index) {
    clearPendingMove();
    const source = listEntryOf(dragged);
    const target = targetItems.length > 0 ? listEntryOf(targetItems[0]) : null;
    if (!source || !target || targetItems.some(item => !target.container.contains(item))) {
        return; // empty target list or an unknown layout: wait for the real refresh instead
    }

    const restore = [];
    const setOrder = (el, order) => {
        const previous = el.style.order;
        el.style.order = String(order);
        restore.push(() => {
            el.style.order = previous;
        });
    };

    targetItems.forEach((item, i) => {
        const found = listEntryOf(item);
        if (found && found.container === target.container) {
            setOrder(found.entry, i < index ? i : i + 1);
        }
    });

    if (source.container === target.container) {
        setOrder(source.entry, index);
    } else {
        const copy = source.entry.cloneNode(true);
        copy.classList.add(PLACEHOLDER);
        copy.querySelectorAll("[draggable]").forEach(el => el.removeAttribute("draggable"));
        copy.style.order = String(index);
        target.container.appendChild(copy);
        source.entry.classList.add(MOVED_AWAY);
        restore.push(() => {
            copy.remove();
            source.entry.classList.remove(MOVED_AWAY);
        });
    }

    // As soon as Mendix re-renders the target list, the real data is there: drop the preview. Only the target
    // counts — the source list may refresh first, and the card must not vanish from both lists in between.
    const observer = new MutationObserver(clearPendingMove);
    observer.observe(target.container, { childList: true });
    pending = { observers: [observer], restore, timer: window.setTimeout(clearPendingMove, TIMEOUT_MS) };
}

/**
 * The drop action finished. If it changed data, the refresh follows within moments; if it did not (it opened a
 * confirmation, or decided nothing changes), undo the preview soon instead of waiting for the safety net.
 */
export function settlePendingMove() {
    if (!pending) {
        return;
    }
    window.clearTimeout(pending.timer);
    pending.timer = window.setTimeout(clearPendingMove, SETTLE_MS);
}
