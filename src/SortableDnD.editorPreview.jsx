export function preview({ role, group, targetSelector, content }) {
    const label = `Sortable DnD — ${role === "zone" ? "Zone" : "Item"} (${group || "default"})${
        targetSelector ? ` → ${targetSelector}` : ""
    }`;
    const Content = content && content.renderer;
    return (
        <div className="sortablednd-preview">
            <div className="sortablednd-preview-label">{label}</div>
            {Content ? (
                <Content caption="Place content here">
                    <div />
                </Content>
            ) : null}
        </div>
    );
}

export function getPreviewCss() {
    return require("./ui/SortableDnD.editorPreview.css");
}
