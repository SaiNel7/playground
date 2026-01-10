"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, MessageSquare, Trash2, Edit2, Check } from "lucide-react";
import { Comment } from "@/lib/types";
import {
  getDocumentComments,
  createComment,
  updateComment,
  deleteComment,
} from "@/lib/store/commentStore";
import { cn } from "@/lib/utils";

interface CommentPanelProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  selectedCommentId: string | null;
  onSelectComment: (id: string | null) => void;
  pendingComment: { text: string } | null;
  onAddComment: () => void;
  onDeleteComment: (commentId: string) => void;
  onCancelPending: () => void;
}

export function CommentPanel({
  documentId,
  isOpen,
  onClose,
  selectedCommentId,
  onSelectComment,
  pendingComment,
  onAddComment,
  onDeleteComment,
  onCancelPending,
}: CommentPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentData, setCommentData] = useState<Record<string, { text: string; position: number }>>({});
  const [newCommentText, setNewCommentText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get live data (text + position) from the editor and clean up orphaned comments
  const refreshCommentData = useCallback(() => {
    const getAllData = (window as any).__editorGetAllCommentData;
    if (!getAllData) return;

    const data = getAllData();
    setCommentData(data);

    // Check for orphaned comments (exist in storage but not in editor)
    const storedComments = getDocumentComments(documentId);
    const orphanedComments = storedComments.filter(
      (comment) => !data[comment.id]
    );

    // Delete orphaned comments
    if (orphanedComments.length > 0) {
      orphanedComments.forEach((comment) => {
        deleteComment(comment.id);
        onDeleteComment(comment.id);
      });
      // Reload comments after cleanup
      setComments(getDocumentComments(documentId));
    }
  }, [documentId, onDeleteComment]);

  // Load comments and position data
  const loadComments = useCallback(() => {
    const docs = getDocumentComments(documentId);
    setComments(docs);
    // Small delay to ensure editor has updated
    setTimeout(refreshCommentData, 50);
  }, [documentId, refreshCommentData]);

  // Load comments when panel opens
  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, documentId, loadComments]);

  // Refresh comment data periodically while panel is open (to catch edits)
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(refreshCommentData, 500);
    return () => clearInterval(interval);
  }, [isOpen, refreshCommentData]);

  // Sort comments by their position in the document
  const sortedComments = [...comments].sort((a, b) => {
    const posA = commentData[a.id]?.position ?? Infinity;
    const posB = commentData[b.id]?.position ?? Infinity;
    return posA - posB;
  });

  // Focus input when pending comment exists
  useEffect(() => {
    if (pendingComment && inputRef.current) {
      inputRef.current.focus();
    }
  }, [pendingComment]);

  // Get the display text for a comment (live from editor, or fallback to stored)
  const getDisplayText = (comment: Comment): string => {
    const data = commentData[comment.id];
    // Use live text if available, otherwise fall back to stored
    return data?.text || comment.highlightedText;
  };

  // Handle adding a new comment
  const handleAddComment = () => {
    if (!pendingComment || !newCommentText.trim()) return;

    const comment = createComment(
      documentId,
      newCommentText.trim(),
      pendingComment.text
    );

    // Apply the comment mark in the editor
    const applyMark = (window as any).__editorApplyCommentMark;
    if (applyMark) {
      applyMark(comment.id);
    }

    onAddComment();
    setNewCommentText("");
    loadComments();
  };

  // Handle editing a comment
  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.content);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editText.trim()) return;
    updateComment(editingId, editText.trim());
    setEditingId(null);
    setEditText("");
    loadComments();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  // Handle deleting a comment
  const handleDelete = (commentId: string) => {
    deleteComment(commentId);

    // Remove the comment mark in the editor
    const removeMark = (window as any).__editorRemoveCommentMark;
    if (removeMark) {
      removeMark(commentId);
    }

    onDeleteComment(commentId);
    loadComments();
  };

  // Handle cancel pending
  const handleCancelPending = () => {
    setNewCommentText("");
    onCancelPending();
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 h-full border-l border-border bg-background flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Comments</span>
          {comments.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {comments.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Pending new comment */}
        {pendingComment && (
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-2">
              Commenting on:
            </div>
            <div className="text-sm bg-yellow-100/50 dark:bg-yellow-900/20 px-2 py-1 rounded mb-3 italic">
              "{pendingComment.text}"
            </div>
            <textarea
              ref={inputRef}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-border resize-none"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleAddComment();
                }
                if (e.key === "Escape") {
                  handleCancelPending();
                }
              }}
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={handleCancelPending}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddComment}
                disabled={!newCommentText.trim()}
                className="px-3 py-1.5 text-sm bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Comments list - sorted by position in document */}
        {sortedComments.length === 0 && !pendingComment ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No comments yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Select text and click the comment button
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedComments.map((comment) => {
              const displayText = getDisplayText(comment);
              return (
                <div
                  key={comment.id}
                  className={cn(
                    "p-4 cursor-pointer transition-colors",
                    selectedCommentId === comment.id
                      ? "bg-muted/50"
                      : "hover:bg-muted/30"
                  )}
                  onClick={() => onSelectComment(comment.id)}
                >
                  {/* Highlighted text preview - now shows live text */}
                  <div className="text-xs text-muted-foreground mb-2 truncate">
                    On: "{displayText}"
                  </div>

                  {editingId === comment.id ? (
                    // Edit mode
                    <div>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-border resize-none"
                        rows={3}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            handleSaveEdit();
                          }
                          if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                      />
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button
                          onClick={handleCancelEdit}
                          className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="p-1.5 hover:bg-muted rounded transition-colors text-foreground"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(comment.updatedAt)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(comment);
                            }}
                            className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(comment.id);
                            }}
                            className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return new Date(timestamp).toLocaleDateString();
}
