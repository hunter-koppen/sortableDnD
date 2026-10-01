import { CLASS, clearIndicators, endDrag, getActiveDrag } from "./dragState";
import { useEffect, useLayoutEffect, useRef } from "react";
import Big from "big.js";
import { setDataAttributes } from "./dom";

/**
 * The items that belong directly to this zone (not to a zone nested inside it), in DOM order,
 * without the item that is being dragged.
 */
function zoneItems(zone, group, dragged) {
    return Array.from(zone.querySelectorAll(`.${CLASS.item}`)).filter(
        item =>
            item !== dragged &&
            item.dataset.sortableGroup === group &&
            item.dataset.sortableKey &&
            item.parentElement &&
            item.parentElement.closest(`.${CLASS.zone}`) === zone
    );
}

/** Where a drop at the pointer position would land: before which item, and at which index. */
function dropTarget(zone, group, dragged, e, orientation) {
    const items = zoneItems(zone, group, dragged);
    const index = items.findIndex(item => {
        const rect = item.getBoundingClientRect();
        return orientation === "horizontal"
            ? e.clientX < rect.left + rect.width / 2
            : e.clientY < rect.top + rect.height / 2;
    });
    return index === -1 ? { before: null, index: items.length } : { before: items[index], index };
}

/**
 * Makes `element` a drop zone. Pass `null` to do nothing (used when the widget is an item).
 */
export function useSortableZone(element, { zoneKey, group, disabled, orientation, onDrop }) {
    const latest = useRef({ group, disabled, orientation, onDrop });
    useLayoutEffect(() => {
        latest.current = { group, disabled, orientation, onDrop };
    });

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

        const onDragOver = e => {
            const drag = accepts();
            if (!drag) {
                return; // not calling preventDefault() tells the browser this is no drop target
            }
            e.preventDefault();
            e.stopPropagation(); // a nested zone wins over the zone around it
            e.dataTransfer.dropEffect = "move";

            const { before } = dropTarget(element, drag.group, drag.element, e, latest.current.orientation);
            clearIndicators();
            element.classList.add(CLASS.over);
            if (before) {
                before.classList.add(CLASS.insertBefore);
            } else {
                element.classList.add(CLASS.insertEnd);
            }
        };

        const onDragLeave = e => {
            if (e.relatedTarget instanceof Node && element.contains(e.relatedTarget)) {
                return;
            }
            element.classList.remove(CLASS.over, CLASS.insertEnd);
            element.querySelectorAll(`.${CLASS.insertBefore}`).forEach(el => el.classList.remove(CLASS.insertBefore));
        };

        const onDropEvent = e => {
            const drag = accepts();
            if (!drag) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();

            const { before, index } = dropTarget(element, drag.group, drag.element, e, latest.current.orientation);
            endDrag();

            const action = latest.current.onDrop;
            if (action && action.canExecute && !action.isExecuting) {
                action.execute({
                    draggedKey: drag.key,
                    fromZoneKey: drag.fromZoneKey,
                    beforeKey: before ? before.dataset.sortableKey : "",
                    newIndex: new Big(index)
                });
            }
        };

        element.addEventListener("dragover", onDragOver);
        element.addEventListener("dragleave", onDragLeave);
        element.addEventListener("drop", onDropEvent);
        return () => {
            element.removeEventListener("dragover", onDragOver);
            element.removeEventListener("dragleave", onDragLeave);
            element.removeEventListener("drop", onDropEvent);
            element.classList.remove(CLASS.zone, CLASS.over, CLASS.insertEnd);
            setDataAttributes(element, {
                sortableZoneKey: undefined,
                sortableGroup: undefined,
                sortableOrientation: undefined
            });
        };
    }, [element]);
}
