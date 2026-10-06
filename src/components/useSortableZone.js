import { CLASS, clearIndicators, endDrag, getActiveDrag, showIndicator, zoneItems } from "./dragState";
import { applyOptimisticMove, settlePendingMove } from "./optimistic";
import { useEffect, useLayoutEffect, useRef } from "react";
import Big from "big.js";
import { setDataAttributes } from "./dom";

/**
 * Where a drop at `point` lands: the items around it and the index among the items without the dragged one.
 * Measured on the live layout, gap included: the items below the gap have moved down with it, so the pointer
 * stays on the same side of their middle and the position does not flip back and forth.
 */
function dropTarget(zone, drag, point, orientation) {
    const items = zoneItems(zone, drag.group, drag.element);
    let index = items.findIndex(item => {
        const rect = item.getBoundingClientRect();
        return orientation === "horizontal"
            ? point.x < rect.left + rect.width / 2
            : point.y < rect.top + rect.height / 2;
    });
    if (index === -1) {
        index = items.length;
    }
    return { items, index, after: items[index - 1] || null, before: items[index] || null };
}

function sortValueOf(item) {
    return item && item.dataset.sortableSort ? new Big(item.dataset.sortableSort) : null;
}

/**
 * A sort value between the neighbours at the drop position: the average of both, one less than the item
 * below, one more than the item above, or 0 in an empty zone. Undefined when the items carry no sort value.
 */
function newSortValue({ items, after, before }) {
    const above = sortValueOf(after);
    const below = sortValueOf(before);
    if (above && below) {
        return above.plus(below).div(2);
    }
    if (below) {
        return below.minus(1);
    }
    if (above) {
        return above.plus(1);
    }
    return items.length === 0 ? new Big(0) : undefined;
}

/**
 * Makes `element` a drop zone. Pass `null` to do nothing (used when the widget is an item).
 */
export function useSortableZone(element, { zoneKey, group, disabled, orientation, optimistic, onDrop }) {
    const latest = useRef({ group, disabled, orientation, optimistic, onDrop });
    useLayoutEffect(() => {
        latest.current = { group, disabled, orientation, optimistic, onDrop };
    });

    // When the drop action stops executing, let a pending preview settle (see settlePendingMove).
    const executing = !!(onDrop && onDrop.isExecuting);
    const wasExecuting = useRef(false);
    useEffect(() => {
        if (wasExecuting.current && !executing) {
            settlePendingMove();
        }
        wasExecuting.current = executing;
    }, [executing]);

    useEffect(() => {
        if (element) {
            setDataAttributes(element, {
                sortableZoneKey: zoneKey || "",
                sortableGroup: group,
                sortableOrientation: orientation
            });
        }
    }, [element, zoneKey, group, orientation]);

    useEffect(() => {
        if (!element) {
            return undefined;
        }
        element.classList.add(CLASS.zone);

        const accepts = () => {
            const drag = getActiveDrag();
            const { group: zoneGroup, disabled: isDisabled } = latest.current;
            return drag && !isDisabled && drag.group === zoneGroup ? drag : null;
        };

        // dragover fires for every mouse move; measure and update the indicator at most once per frame.
        let frame = 0;
        let point = null;
        const updateIndicator = () => {
            frame = 0;
            const drag = accepts();
            if (drag && point) {
                const { items, index } = dropTarget(element, drag, point, latest.current.orientation);
                showIndicator(element, items, index);
            }
        };

        const onDragOver = e => {
            if (!accepts()) {
                return; // not calling preventDefault() tells the browser this is no drop target
            }
            e.preventDefault();
            e.stopPropagation(); // a nested zone wins over the zone around it
            e.dataTransfer.dropEffect = "move";
            point = { x: e.clientX, y: e.clientY };
            if (!frame) {
                frame = window.requestAnimationFrame(updateIndicator);
            }
        };

        const onDragLeave = e => {
            if (e.relatedTarget instanceof Node && element.contains(e.relatedTarget)) {
                return;
            }
            clearIndicators(element);
        };

        const onDropEvent = e => {
            const drag = accepts();
            if (!drag) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            if (frame) {
                window.cancelAnimationFrame(frame);
                frame = 0;
            }

            const target = dropTarget(element, drag, { x: e.clientX, y: e.clientY }, latest.current.orientation);
            endDrag();

            // Dropped where it already was: nothing to do.
            const ownZone = drag.element.parentElement && drag.element.parentElement.closest(`.${CLASS.zone}`);
            if (ownZone === element && zoneItems(element, drag.group, null).indexOf(drag.element) === target.index) {
                return;
            }

            const action = latest.current.onDrop;
            if (!action || !action.canExecute || action.isExecuting) {
                return;
            }
            if (latest.current.optimistic) {
                applyOptimisticMove(drag.element, target.items, target.index);
            }
            action.execute({
                draggedKey: drag.key,
                fromZoneKey: drag.fromZoneKey,
                afterKey: target.after ? target.after.dataset.sortableKey : "",
                beforeKey: target.before ? target.before.dataset.sortableKey : "",
                newIndex: new Big(target.index),
                newSortValue: newSortValue(target)
            });
        };

        element.addEventListener("dragover", onDragOver);
        element.addEventListener("dragleave", onDragLeave);
        element.addEventListener("drop", onDropEvent);
        return () => {
            if (frame) {
                window.cancelAnimationFrame(frame);
            }
            element.removeEventListener("dragover", onDragOver);
            element.removeEventListener("dragleave", onDragLeave);
            element.removeEventListener("drop", onDropEvent);
            clearIndicators(element);
            element.classList.remove(CLASS.zone);
            setDataAttributes(element, {
                sortableZoneKey: undefined,
                sortableGroup: undefined,
                sortableOrientation: undefined
            });
        };
    }, [element]);
}
