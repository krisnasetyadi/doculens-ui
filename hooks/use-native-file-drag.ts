import { useState, type DragEvent } from "react";

/** Whether a drag actually carries OS files (vs. e.g. dragged text) — real
 * files aren't readable until drop, but their presence is visible via
 * `dataTransfer.types` during dragenter/dragover. */
function isFileDrag(dataTransfer: DataTransfer | null): boolean {
  return !!dataTransfer?.types.includes("Files");
}

/** Native OS file drag-and-drop onto a React element — generalizes the
 * pattern already proven in skill-upload.tsx (dragover-driven highlight,
 * containment-checked dragleave to avoid flicker over child elements) so it
 * can be reused as a drop target anywhere in the Sources panel. */
export function useNativeFileDrag(onDropFiles: (files: FileList) => void) {
  const [isOver, setIsOver] = useState(false);

  const onDragOver = (e: DragEvent) => {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
  };
  const onDragLeave = (e: DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsOver(false);
  };
  const onDrop = (e: DragEvent) => {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    if (e.dataTransfer.files.length) onDropFiles(e.dataTransfer.files);
  };

  return { isOver, dragHandlers: { onDragOver, onDragLeave, onDrop } };
}
