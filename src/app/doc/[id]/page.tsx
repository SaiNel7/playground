"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Editor } from "@/components/editor/Editor";
import { CommentPanel } from "@/components/editor/CommentPanel";
import {
  getDocument,
  createDocument,
  updateDocument,
} from "@/lib/store/documentStore";
import { getDocumentComments } from "@/lib/store/commentStore";
import { Document } from "@/lib/types";

interface DocPageProps {
  params: {
    id: string;
  };
}

export default function DocPage({ params }: DocPageProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [title, setTitle] = useState("");
  const [lastEdited, setLastEdited] = useState<number | null>(null);
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Comment panel state (lifted from Editor)
  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [pendingComment, setPendingComment] = useState<{ text: string } | null>(null);
  const [commentCount, setCommentCount] = useState(0);

  // Load comment count
  const loadCommentCount = useCallback(() => {
    const comments = getDocumentComments(params.id);
    setCommentCount(comments.length);
  }, [params.id]);

  // Load or create document on mount
  useEffect(() => {
    let doc = getDocument(params.id);

    // Auto-create document if it doesn't exist
    if (!doc) {
      doc = createDocument({ id: params.id, title: "Untitled" });
    }

    setDocument(doc);
    setTitle(doc.title);
    setLastEdited(doc.updatedAt);
    loadCommentCount();
  }, [params.id, loadCommentCount]);

  // Debounced title save
  const saveTitle = useCallback(
    (newTitle: string) => {
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current);
      }

      titleTimeoutRef.current = setTimeout(() => {
        updateDocument(params.id, { title: newTitle });
        setLastEdited(Date.now());
      }, 500);
    },
    [params.id]
  );

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    saveTitle(newTitle);
  };

  // Handle editor content update
  const handleEditorUpdate = useCallback(() => {
    setLastEdited(Date.now());
  }, []);

  // Toggle comment panel
  const toggleCommentPanel = useCallback(() => {
    setIsCommentPanelOpen((prev) => !prev);
    if (isCommentPanelOpen) {
      // Closing - clear selection and pending
      setSelectedCommentId(null);
      setPendingComment(null);
    }
  }, [isCommentPanelOpen]);

  // Close comment panel
  const closeCommentPanel = useCallback(() => {
    setIsCommentPanelOpen(false);
    setSelectedCommentId(null);
    setPendingComment(null);
  }, []);

  // Handle adding comment from selection
  const handleAddCommentFromSelection = useCallback((text: string) => {
    setPendingComment({ text });
    setIsCommentPanelOpen(true);
  }, []);

  // Handle comment added
  const handleCommentAdded = useCallback(() => {
    setPendingComment(null);
    loadCommentCount();
  }, [loadCommentCount]);

  // Handle comment deleted
  const handleCommentDeleted = useCallback((commentId: string) => {
    if (selectedCommentId === commentId) {
      setSelectedCommentId(null);
    }
    loadCommentCount();
  }, [selectedCommentId, loadCommentCount]);

  // Handle clicking a comment highlight
  const handleCommentClick = useCallback((commentId: string) => {
    setSelectedCommentId(commentId);
    setIsCommentPanelOpen(true);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current);
      }
    };
  }, []);

  // Format relative time
  const formatLastEdited = (timestamp: number | null) => {
    if (!timestamp) return "";

    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 5) return "Saved";
    if (seconds < 60) return `Edited ${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Edited ${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Edited ${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `Edited ${days}d ago`;
  };

  // Loading state
  if (!document) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-11 border-b border-border" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title || "Untitled"} />

        <div className="flex-1 overflow-auto">
          {/* Document header with large editable title */}
          <div className="max-w-3xl mx-auto w-full px-16 pt-16 pb-4">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled"
              className="w-full text-4xl font-bold text-foreground bg-transparent outline-none placeholder:text-muted-foreground/40"
              spellCheck={false}
            />

            {/* Last edited indicator */}
            <div className="mt-3 text-xs text-muted-foreground/60">
              {formatLastEdited(lastEdited)}
            </div>
          </div>

          {/* Editor */}
          <Editor
            documentId={params.id}
            onUpdate={handleEditorUpdate}
            isCommentPanelOpen={isCommentPanelOpen}
            onToggleCommentPanel={toggleCommentPanel}
            onAddCommentFromSelection={handleAddCommentFromSelection}
            onCommentClick={handleCommentClick}
            onCommentAdded={handleCommentAdded}
            onCommentDeleted={handleCommentDeleted}
            commentCount={commentCount}
            pendingComment={pendingComment}
          />
        </div>
      </div>

      {/* Comment panel (outside main content, affects full height) */}
      <CommentPanel
        documentId={params.id}
        isOpen={isCommentPanelOpen}
        onClose={closeCommentPanel}
        selectedCommentId={selectedCommentId}
        onSelectComment={setSelectedCommentId}
        pendingComment={pendingComment}
        onAddComment={handleCommentAdded}
        onDeleteComment={handleCommentDeleted}
        onCancelPending={() => setPendingComment(null)}
      />
    </div>
  );
}
