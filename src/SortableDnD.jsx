import "./ui/SortableDnD.css";
import { useLayoutEffect, useRef, useState } from "react";
import classNames from "classnames";
import { useSortableItem } from "./components/useSortableItem";
import { useSortableZone } from "./components/useSortableZone";

/**
 * The element that gets the drag/drop behaviour: either the widget's own wrapper around its content,
 * or — with 'Attach to' — the closest ancestor matching the selector.
 */
function useTargetElement(targetSelector, wrapperRef, anchorRef) {
    const [element, setElement] = useState(null);
    useLayoutEffect(() => {
        if (targetSelector) {
            const found = anchorRef.current ? anchorRef.current.closest(targetSelector) : null;
            if (!found) {
                console.warn(`SortableDnD: no ancestor matches "${targetSelector}"`);
            }
            setElement(found);
        } else {
            setElement(wrapperRef.current);
        }
    }, [targetSelector, wrapperRef, anchorRef]);
    return element;
}

export function SortableDnD(props) {
    const { role, group, targetSelector, content, orientation, optimisticMove, onDrop } = props;
    const wrapperRef = useRef(null);
    const anchorRef = useRef(null);
    const selector = targetSelector ? targetSelector.trim() : "";
    const element = useTargetElement(selector, wrapperRef, anchorRef);
    const disabled = props.disabled ? props.disabled.value === true : false;

    useSortableItem(role === "item" ? element : null, {
        itemKey: props.itemKey ? props.itemKey.value : undefined,
        sortValue: props.sortValue && props.sortValue.value ? props.sortValue.value.toString() : undefined,
        group,
        disabled
    });
    useSortableZone(role === "zone" ? element : null, {
        zoneKey: props.zoneKey ? props.zoneKey.value : undefined,
        group,
        disabled,
        orientation,
        optimistic: optimisticMove,
        onDrop
    });

    if (selector) {
        return (
            <>
                <span ref={anchorRef} className="sortablednd-anchor" aria-hidden="true" />
                {content}
            </>
        );
    }
    return (
        <div ref={wrapperRef} className={classNames("sortablednd", props.class)} style={props.style}>
            {content}
        </div>
    );
}
