import type { Editor } from "@tiptap/react";

/**
 * Find the range of text marked with a specific comment anchor ID.
 * Returns { from, to } positions or null if not found.
 *
 * This is a best-effort search that scans the ProseMirror document
 * for marks with the given commentId attribute.
 */
export function findAnchorRange(
  editor: Editor | null,
  anchorId: string
): { from: number; to: number } | null {
  if (!editor) return null;

  const { doc } = editor.state;
  let foundFrom: number | null = null;
  let foundTo: number | null = null;

  // Traverse the document to find marks with this anchorId
  doc.descendants((node, pos) => {
    if (node.isText && node.marks) {
      for (const mark of node.marks) {
        if (mark.type.name === "comment" && mark.attrs.commentId === anchorId) {
          if (foundFrom === null) {
            // First occurrence
            foundFrom = pos;
            foundTo = pos + node.nodeSize;
          } else {
            // Extend range for consecutive marked text
            foundTo = pos + node.nodeSize;
          }
        }
      }
    }
  });

  if (foundFrom !== null && foundTo !== null) {
    return { from: foundFrom, to: foundTo };
  }

  return null;
}
