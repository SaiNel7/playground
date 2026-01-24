"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { Editor } from "@/components/editor/Editor";
import { CommentPanel } from "@/components/editor/CommentPanel";
import { BrainPanel } from "@/components/ai/BrainPanel";
import {
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  getAllDocuments,
  toggleStarDocument,
} from "@/lib/store/documentStore";
import { getDocumentComments, createAIThread } from "@/lib/store/commentStore";
import { Document } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { EditorProvider } from "@/lib/EditorContext";

interface DocPageProps {
  params: {
    id: string;
  };
}

export default function DocPage({ params }: DocPageProps) {
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [title, setTitle] = useState("");
  const [starred, setStarred] = useState(false);
  const [lastEdited, setLastEdited] = useState<number | null>(null);
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Comment panel state (lifted from Editor)
  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [pendingComment, setPendingComment] = useState<{ text: string } | null>(null);
  const [commentCount, setCommentCount] = useState(0);

  // Brain panel state
  const [isBrainPanelOpen, setIsBrainPanelOpen] = useState(false);

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
    setStarred(doc.starred || false);
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
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    saveTitle(newTitle);
  };

  // Auto-resize textarea when title changes
  useEffect(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = 'auto';
      titleTextareaRef.current.style.height = titleTextareaRef.current.scrollHeight + 'px';
    }
  }, [title]);

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

  // Handle Ask AI from selection
  const handleAskAIFromSelection = useCallback((text: string) => {
    // Create an AI thread with default mode (critique)
    const thread = createAIThread(params.id, text, "critique");

    // Open comment panel and select the new AI thread
    setSelectedCommentId(thread.id);
    setIsCommentPanelOpen(true);
    loadCommentCount();
  }, [params.id, loadCommentCount]);

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

  // Handle toggle star
  const handleToggleStar = useCallback(() => {
    const newStarred = toggleStarDocument(params.id);
    setStarred(newStarred);
  }, [params.id]);

  // Handle delete document
  const handleDeleteDocument = useCallback(() => {
    deleteDocument(params.id);
    
    // Navigate to another document or home
    const remainingDocs = getAllDocuments();
    if (remainingDocs.length > 0) {
      router.push(`/doc/${remainingDocs[0].id}`);
    } else {
      router.push("/");
    }
  }, [params.id, router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current);
      }
    };
  }, []);

  // Format relative time for last edited
  const formatLastEdited = (timestamp: number | null) => {
    if (!timestamp) return "";
    return formatRelativeTime(timestamp, {
      prefix: "Edited",
      recentLabel: "Saved",
      showSeconds: true,
    });
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
    <EditorProvider>
      <div className="flex h-full">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar
            title={title || "Untitled"}
            starred={starred}
            onToggleStar={handleToggleStar}
            onDelete={handleDeleteDocument}
            onToggleBrain={() => setIsBrainPanelOpen(!isBrainPanelOpen)}
            isBrainOpen={isBrainPanelOpen}
          />

          <div className="flex-1 overflow-auto">
            {/* Document header with large editable title */}
            <div className="max-w-3xl mx-auto w-full px-16 pt-16 pb-4">
              <textarea
                ref={titleTextareaRef}
                value={title}
                onChange={handleTitleChange}
                placeholder="Untitled"
                className="w-full text-4xl font-bold text-foreground bg-transparent outline-none placeholder:text-muted-foreground/40 resize-none overflow-hidden"
                spellCheck={false}
                rows={1}
                onInput={(e) => {
                  // Auto-resize textarea to fit content
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
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
              onAskAIFromSelection={handleAskAIFromSelection}
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

        {/* Brain panel (outside main content, affects full height) */}
        <BrainPanel
          projectId={params.id}
          isOpen={isBrainPanelOpen}
          onClose={() => setIsBrainPanelOpen(false)}
        />
      </div>
    </EditorProvider>
  );
}
