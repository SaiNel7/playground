"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { editorExtensions } from "./extensions";
import { SelectionBubble } from "./SelectionBubble";
import "./editor.css";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDocument, updateDocument } from "@/lib/store/documentStore";
import { getDocumentComments, deleteComment } from "@/lib/store/commentStore";

interface EditorProps {
  documentId: string;
  onUpdate?: () => void;
  // Comment panel props (lifted state)
  isCommentPanelOpen: boolean;
  onToggleCommentPanel: () => void;
  onAddCommentFromSelection: (text: string) => void;
  onCommentClick: (commentId: string) => void;
  onCommentAdded: () => void;
  onCommentDeleted: (commentId: string) => void;
  commentCount: number;
  pendingComment: { text: string } | null;
}

export function Editor({
  documentId,
  onUpdate,
  isCommentPanelOpen,
  onToggleCommentPanel,
  onAddCommentFromSelection,
  onCommentClick,
  onCommentAdded,
  onCommentDeleted,
  commentCount,
  pendingComment,
}: EditorProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: editorExtensions,
    content: "",
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
      handleClick: (view, pos, event) => {
        // Check if clicking on a comment highlight
        const target = event.target as HTMLElement;
        if (target.classList.contains("comment-highlight")) {
          const commentId = target.getAttribute("data-comment-id");
          if (commentId) {
            onCommentClick(commentId);
            return true;
          }
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  // Clean up orphaned marks (marks referencing deleted comments)
  const cleanupOrphanedMarks = useCallback(() => {
    if (!editor) return;

    const { doc, tr } = editor.state;
    const storedComments = getDocumentComments(documentId);
    const validCommentIds = new Set(storedComments.map((c) => c.id));

    let hasChanges = false;

    // Find marks with comment IDs that don't exist in storage
    doc.descendants((node, pos) => {
      if (node.isText && node.marks) {
        node.marks.forEach((mark) => {
          if (mark.type.name === "comment" && mark.attrs.commentId) {
            if (!validCommentIds.has(mark.attrs.commentId)) {
              // Remove this orphaned mark
              tr.removeMark(pos, pos + node.nodeSize, mark.type);
              hasChanges = true;
            }
          }
        });
      }
    });

    if (hasChanges) {
      editor.view.dispatch(tr);
    }
  }, [editor, documentId]);

  // Clean up orphaned comments (comments without text in editor)
  const cleanupOrphanedComments = useCallback(() => {
    if (!editor) return;

    const { doc } = editor.state;
    const activeCommentIds = new Set<string>();

    // Find all comment IDs that exist in the editor
    doc.descendants((node) => {
      if (node.isText && node.marks) {
        node.marks.forEach((mark) => {
          if (mark.type.name === "comment" && mark.attrs.commentId) {
            activeCommentIds.add(mark.attrs.commentId);
          }
        });
      }
    });

    // Find and delete orphaned comments
    const storedComments = getDocumentComments(documentId);
    storedComments.forEach((comment) => {
      if (!activeCommentIds.has(comment.id)) {
        deleteComment(comment.id);
        onCommentDeleted(comment.id);
      }
    });

    // Also clean up any orphaned marks
    cleanupOrphanedMarks();
  }, [editor, documentId, onCommentDeleted, cleanupOrphanedMarks]);

  // Debounced save function
  const saveContent = useCallback(
    (content: any) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        updateDocument(documentId, { content });
        onUpdate?.();
      }, 600);

      // Debounced cleanup of orphaned comments
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      cleanupTimeoutRef.current = setTimeout(() => {
        cleanupOrphanedComments();
      }, 800);
    },
    [documentId, onUpdate, cleanupOrphanedComments]
  );

  // Handle editor updates
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (isInitializedRef.current) {
        // Immediately clean up any orphaned marks (marks without valid comments)
        // This catches the case where new text inherits an orphaned mark
        cleanupOrphanedMarks();

        const json = editor.getJSON();
        saveContent(json);
      }
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, saveContent, cleanupOrphanedMarks]);

  // Load document content on mount
  useEffect(() => {
    if (!editor) return;

    isInitializedRef.current = false;
    const doc = getDocument(documentId);

    if (doc?.content) {
      editor.commands.setContent(doc.content);
    } else {
      editor.commands.clearContent();
    }

    setTimeout(() => {
      isInitializedRef.current = true;
    }, 0);
  }, [editor, documentId]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, []);

  // Apply comment mark when pending comment is added
  const applyCommentMark = useCallback(
    (commentId: string) => {
      if (!editor) return;
      editor.chain().focus().setComment(commentId).run();
      onCommentAdded();
    },
    [editor, onCommentAdded]
  );

  // Remove comment mark when comment is deleted
  const removeCommentMark = useCallback(
    (commentId: string) => {
      if (!editor) return;

      const { doc } = editor.state;
      let foundFrom = -1;
      let foundTo = -1;

      doc.descendants((node, pos) => {
        if (node.marks) {
          node.marks.forEach((mark) => {
            if (mark.type.name === "comment" && mark.attrs.commentId === commentId) {
              foundFrom = pos;
              foundTo = pos + node.nodeSize;
            }
          });
        }
      });

      if (foundFrom !== -1) {
        editor
          .chain()
          .focus()
          .setTextSelection({ from: foundFrom, to: foundTo })
          .unsetComment()
          .run();
      }

      onCommentDeleted(commentId);
    },
    [editor, onCommentDeleted]
  );

  // Get current text for a comment from the editor (live, not stored)
  const getCommentText = useCallback(
    (commentId: string): string | null => {
      if (!editor) return null;

      const { doc } = editor.state;
      let text = "";

      doc.descendants((node, pos) => {
        if (node.isText && node.marks) {
          node.marks.forEach((mark) => {
            if (mark.type.name === "comment" && mark.attrs.commentId === commentId) {
              text += node.text || "";
            }
          });
        }
      });

      return text || null;
    },
    [editor]
  );

  // Get all comment texts from the editor (for batch updates)
  const getAllCommentTexts = useCallback((): Record<string, string> => {
    if (!editor) return {};

    const { doc } = editor.state;
    const texts: Record<string, string> = {};

    doc.descendants((node, pos) => {
      if (node.isText && node.marks) {
        node.marks.forEach((mark) => {
          if (mark.type.name === "comment" && mark.attrs.commentId) {
            const id = mark.attrs.commentId;
            texts[id] = (texts[id] || "") + (node.text || "");
          }
        });
      }
    });

    return texts;
  }, [editor]);

  // Get all comment data including position (for sorting by location)
  const getAllCommentData = useCallback((): Record<string, { text: string; position: number }> => {
    if (!editor) return {};

    const { doc } = editor.state;
    const data: Record<string, { text: string; position: number }> = {};

    doc.descendants((node, pos) => {
      if (node.isText && node.marks) {
        node.marks.forEach((mark) => {
          if (mark.type.name === "comment" && mark.attrs.commentId) {
            const id = mark.attrs.commentId;
            if (!data[id]) {
              // First occurrence - store position
              data[id] = { text: node.text || "", position: pos };
            } else {
              // Subsequent occurrences - append text, keep first position
              data[id].text += node.text || "";
            }
          }
        });
      }
    });

    return data;
  }, [editor]);

  // Expose methods via window for CommentPanel to call
  useEffect(() => {
    (window as any).__editorApplyCommentMark = applyCommentMark;
    (window as any).__editorRemoveCommentMark = removeCommentMark;
    (window as any).__editorGetCommentText = getCommentText;
    (window as any).__editorGetAllCommentTexts = getAllCommentTexts;
    (window as any).__editorGetAllCommentData = getAllCommentData;
    return () => {
      delete (window as any).__editorApplyCommentMark;
      delete (window as any).__editorRemoveCommentMark;
      delete (window as any).__editorGetCommentText;
      delete (window as any).__editorGetAllCommentTexts;
      delete (window as any).__editorGetAllCommentData;
    };
  }, [applyCommentMark, removeCommentMark, getCommentText, getAllCommentTexts, getAllCommentData]);

  // Toggle comment panel (for toolbar button)
  const handleToggleCommentClick = () => {
    onToggleCommentPanel();
  };

  // Handle comment from floating bubble
  const handleBubbleComment = useCallback(
    (text: string) => {
      onAddCommentFromSelection(text);
    },
    [onAddCommentFromSelection]
  );

  if (!editor) {
    return (
      <div className="max-w-3xl mx-auto px-16 py-4">
        <div className="h-48 animate-pulse bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-16 pb-16">
      {/* Floating toolbar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-2 mb-4 border-b border-transparent">
        <div className="flex items-center gap-0.5 flex-wrap">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold (Cmd+B)"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic (Cmd+I)"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive("codeBlock")}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Comment button - toggles panel */}
          <ToolbarButton
            onClick={handleToggleCommentClick}
            isActive={isCommentPanelOpen}
            title="Toggle comments"
          >
            <div className="relative">
              <MessageSquare className="w-4 h-4" />
              {commentCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-foreground text-background text-[10px] rounded-full flex items-center justify-center">
                  {commentCount > 9 ? "9+" : commentCount}
                </span>
              )}
            </div>
          </ToolbarButton>
        </div>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Floating selection bubble for comments */}
      <SelectionBubble editor={editor} onAddComment={handleBubbleComment} />
    </div>
  );
}

// Toolbar button component
function ToolbarButton({
  children,
  onClick,
  isActive,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-2 rounded hover:bg-muted transition-colors",
        isActive && "bg-muted text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// Toolbar divider
function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1" />;
}
