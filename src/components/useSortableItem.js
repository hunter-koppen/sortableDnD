import { CLASS, endDrag, startDrag } from "./dragState";
import { setDataAttributes, setDraggable } from "./dom";
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Makes `element` draggable. Pass `null` to do nothing (used when the widget is a zone).
 */
export function useSortableItem(element, { itemKey, group, disabled }) {
    const latest = useRef({ itemKey, group, disabled });
    useLayoutEffect(() => {
        latest.current = { itemKey, group, disabled };
    });

    useEffect(() => {
        if (element) {
            setDataAttributes(element, { sortableKey: itemKey || "", sortableGroup: group });
            setDraggable(element, !disabled && !!itemKey);
        }
    }, [element, itemKey, group, disabled]);

    useEffect(() => {
        if (!element) {
            return undefined;
        }
        element.classList.add(CLASS.item);

        const onDragStart = e => {
            const { itemKey: key, group: itemGroup, disabled: isDisabled } = latest.current;
            if (isDisabled || !key) {
                e.preventDefault();
                return;
            }
            // A nested item handles its own drag; do not let an outer item take over.
            e.stopPropagation();

            const zone = element.parentElement && element.parentElement.closest(`.${CLASS.zone}`);
            startDrag({
                key,
                group: itemGroup,
                element,
                fromZoneKey: zone && zone.dataset.sortableGroup === itemGroup ? zone.dataset.sortableZoneKey || "" : ""
            });

            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", key); // Firefox only starts a drag when data is set
            const rect = element.getBoundingClientRect();
            e.dataTransfer.setDragImage(element, e.clientX - rect.left, e.clientY - rect.top);
            // Add the class after the browser captured the drag image, so the image is not faded.
            window.requestAnimationFrame(() => element.classList.add(CLASS.dragging));
        };

        const onDragEnd = () => {
            element.classList.remove(CLASS.dragging);
            endDrag();
        };

        element.addEventListener("dragstart", onDragStart);
        element.addEventListener("dragend", onDragEnd);
        return () => {
            element.removeEventListener("dragstart", onDragStart);
            element.removeEventListener("dragend", onDragEnd);
            element.classList.remove(CLASS.item, CLASS.dragging);
            setDraggable(element, undefined);
            setDataAttributes(element, { sortableKey: undefined, sortableGroup: undefined });
        };
    }, [element]);
}
