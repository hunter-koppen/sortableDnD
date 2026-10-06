import { CLASS, endDrag, liftDraggedItem, startDrag } from "./dragState";
import { setDataAttributes, setDraggable, slotOf, slotSize } from "./dom";
import { useEffect, useLayoutEffect, useRef } from "react";
import { clearPendingMove } from "./optimistic";

/**
 * Makes `element` draggable. Pass `null` to do nothing (used when the widget is a zone).
 */
export function useSortableItem(element, { itemKey, sortValue, group, disabled }) {
    const latest = useRef({ itemKey, group, disabled });
    useLayoutEffect(() => {
        latest.current = { itemKey, group, disabled };
    });

    useEffect(() => {
        if (element) {
            setDataAttributes(element, {
                sortableKey: itemKey || "",
                sortableSort: sortValue === undefined ? undefined : sortValue,
                sortableGroup: group
            });
            setDraggable(element, !disabled && !!itemKey);
        }
    }, [element, itemKey, sortValue, group, disabled]);

    useEffect(() => {
        if (!element) {
            return undefined;
        }
        element.classList.add(CLASS.item);

        const onDragStart = e => {
            clearPendingMove();
            const { itemKey: key, group: itemGroup, disabled: isDisabled } = latest.current;
            if (isDisabled || !key) {
                e.preventDefault();
                return;
            }
            // A nested item handles its own drag; do not let an outer item take over.
            e.stopPropagation();

            const closestZone = element.parentElement && element.parentElement.closest(`.${CLASS.zone}`);
            const zone = closestZone && closestZone.dataset.sortableGroup === itemGroup ? closestZone : null;
            const slot = slotOf(element, zone);
            const drag = {
                key,
                group: itemGroup,
                element,
                fromZoneKey: zone ? zone.dataset.sortableZoneKey || "" : "",
                zone,
                slot,
                size: slotSize(slot)
            };
            startDrag(drag);

            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", key); // Firefox only starts a drag when data is set
            const rect = element.getBoundingClientRect();
            e.dataTransfer.setDragImage(element, e.clientX - rect.left, e.clientY - rect.top);
            // Hide the item after the browser captured the drag image (and not during dragstart, which would make
            // Chrome cancel the drag).
            window.requestAnimationFrame(() => liftDraggedItem(drag));
        };

        const onDragEnd = () => {
            endDrag();
        };

        element.addEventListener("dragstart", onDragStart);
        element.addEventListener("dragend", onDragEnd);
        return () => {
            element.removeEventListener("dragstart", onDragStart);
            element.removeEventListener("dragend", onDragEnd);
            element.classList.remove(CLASS.item, CLASS.dragging);
            setDraggable(element, undefined);
            setDataAttributes(element, { sortableKey: undefined, sortableSort: undefined, sortableGroup: undefined });
        };
    }, [element]);
}
