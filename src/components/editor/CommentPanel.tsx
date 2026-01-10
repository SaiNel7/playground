"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  CheckCircle2,
  Circle,
  Send,
} from "lucide-react";
import { CommentThread, CommentMessage } from "@/lib/types";
import {
  getDocumentComments,
  createComment,
  addReplyToThread,
  updateMessage,
  deleteMessage,
  deleteComment,
  toggleResolveThread,
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
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [commentData, setCommentData] = useState<
    Record<string, { text: string; position: number }>
  >({});
  const [newCommentText, setNewCommentText] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [editingMessage, setEditingMessage] = useState<{
    threadId: string;
    messageId: string;
  } | null>(null);
  const [editText, setEditText] = useState("");
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
    new Set()
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get live data (text + position) from the editor and clean up orphaned threads
  const refreshCommentData = useCallback(() => {
    const getAllData = (window as any).__editorGetAllCommentData;
    if (!getAllData) return;

    const data = getAllData();
    setCommentData(data);

    // Check for orphaned threads (exist in storage but not in editor)
    const storedThreads = getDocumentComments(documentId);
    const orphanedThreads = storedThreads.filter((thread) => !data[thread.id]);

    // Delete orphaned threads
    if (orphanedThreads.length > 0) {
      orphanedThreads.forEach((thread) => {
        deleteComment(thread.id);
        onDeleteComment(thread.id);
      });
      // Reload threads after cleanup
      setThreads(getDocumentComments(documentId));
    }
  }, [documentId, onDeleteComment]);

  // Load threads and position data
  const loadThreads = useCallback(() => {
    const docs = getDocumentComments(documentId);
    setThreads(docs);
    // Small delay to ensure editor has updated
    setTimeout(refreshCommentData, 50);
  }, [documentId, refreshCommentData]);

  // Load threads when panel opens
  useEffect(() => {
    if (isOpen) {
      loadThreads();
    }
  }, [isOpen, documentId, loadThreads]);

  // Refresh comment data periodically while panel is open (to catch edits)
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(refreshCommentData, 500);
    return () => clearInterval(interval);
  }, [isOpen, refreshCommentData]);


  // Sort threads by their position in the document
  const sortedThreads = [...threads].sort((a, b) => {
    const posA = commentData[a.id]?.position ?? Infinity;
    const posB = commentData[b.id]?.position ?? Infinity;
    return posA - posB;
  });

  // Separate resolved and unresolved
  const unresolvedThreads = sortedThreads.filter((t) => !t.resolved);
  const resolvedThreads = sortedThreads.filter((t) => t.resolved);

  // Focus input when pending comment exists
  useEffect(() => {
    if (pendingComment && inputRef.current) {
      inputRef.current.focus();
    }
  }, [pendingComment]);

  // Auto-expand selected thread
  useEffect(() => {
    if (selectedCommentId) {
      setExpandedThreads((prev) => new Set([...prev, selectedCommentId]));
    }
  }, [selectedCommentId]);

  // Get the display text for a thread (live from editor, or fallback to stored)
  const getDisplayText = (thread: CommentThread): string => {
    const data = commentData[thread.id];
    return data?.text || thread.highlightedText;
  };

  // Handle adding a new thread
  const handleAddThread = () => {
    if (!pendingComment || !newCommentText.trim()) return;

    const thread = createComment(
      documentId,
      newCommentText.trim(),
      pendingComment.text
    );

    // Apply the comment mark in the editor
    const applyMark = (window as any).__editorApplyCommentMark;
    if (applyMark) {
      applyMark(thread.id);
    }

    onAddComment();
    setNewCommentText("");
    setExpandedThreads((prev) => new Set([...prev, thread.id]));
    loadThreads();
  };

  // Handle adding a reply to a thread
  const handleAddReply = (threadId: string) => {
    const text = replyText[threadId]?.trim();
    if (!text) return;

    addReplyToThread(threadId, text);
    setReplyText((prev) => ({ ...prev, [threadId]: "" }));
    loadThreads();
  };

  // Handle editing a message
  const handleStartEdit = (threadId: string, message: CommentMessage) => {
    setEditingMessage({ threadId, messageId: message.id });
    setEditText(message.content);
    setShowMenu(null);
  };

  const handleSaveEdit = () => {
    if (!editingMessage || !editText.trim()) return;
    updateMessage(editingMessage.threadId, editingMessage.messageId, editText.trim());
    setEditingMessage(null);
    setEditText("");
    loadThreads();
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText("");
  };

  // Handle deleting a message
  const handleDeleteMessage = (threadId: string, messageId: string) => {
    const threadDeleted = deleteMessage(threadId, messageId);

    if (threadDeleted) {
      // Remove the comment mark in the editor
      const removeMark = (window as any).__editorRemoveCommentMark;
      if (removeMark) {
        removeMark(threadId);
      }
      onDeleteComment(threadId);
    }

    loadThreads();
  };

  // Handle deleting an entire thread
  const handleDeleteThread = (threadId: string) => {
    deleteComment(threadId);

    // Remove the comment mark in the editor
    const removeMark = (window as any).__editorRemoveCommentMark;
    if (removeMark) {
      removeMark(threadId);
    }

    onDeleteComment(threadId);
    loadThreads();
  };

  // Handle resolving/unresolving a thread
  const handleToggleResolve = (threadId: string) => {
    toggleResolveThread(threadId);
    loadThreads();
  };

  // Toggle thread expansion
  const toggleExpanded = (threadId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  // Handle cancel pending
  const handleCancelPending = () => {
    setNewCommentText("");
    onCancelPending();
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 h-full border-l border-border bg-background flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Comments</span>
          {threads.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {unresolvedThreads.length}
              {resolvedThreads.length > 0 && (
                <span className="text-muted-foreground/60">
                  /{threads.length}
                </span>
              )}
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Pending new comment */}
        {pendingComment && (
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-2">
              Commenting on:
            </div>
            <div className="text-sm bg-yellow-100/50 dark:bg-yellow-900/20 px-2 py-1 rounded mb-3 italic break-words">
              &ldquo;{pendingComment.text}&rdquo;
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
                  handleAddThread();
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
                onClick={handleAddThread}
                disabled={!newCommentText.trim()}
                className="px-3 py-1.5 text-sm bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Comment
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {threads.length === 0 && !pendingComment && (
          <div className="p-8 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No comments yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Select text and click the comment button
            </p>
          </div>
        )}

        {/* Unresolved threads */}
        {unresolvedThreads.length > 0 && (
          <div className="divide-y divide-border">
            {unresolvedThreads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                displayText={getDisplayText(thread)}
                isSelected={selectedCommentId === thread.id}
                isExpanded={expandedThreads.has(thread.id)}
                replyText={replyText[thread.id] || ""}
                editingMessage={editingMessage}
                editText={editText}
                onSelect={() => onSelectComment(thread.id)}
                onToggleExpand={() => toggleExpanded(thread.id)}
                onReplyTextChange={(text) =>
                  setReplyText((prev) => ({ ...prev, [thread.id]: text }))
                }
                onAddReply={() => handleAddReply(thread.id)}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onEditTextChange={setEditText}
                onDeleteMessage={handleDeleteMessage}
                onDeleteThread={handleDeleteThread}
                onToggleResolve={handleToggleResolve}
              />
            ))}
          </div>
        )}

        {/* Resolved threads */}
        {resolvedThreads.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-muted/30 border-y border-border">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Resolved ({resolvedThreads.length})
              </span>
            </div>
            <div className="divide-y divide-border opacity-60">
              {resolvedThreads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  displayText={getDisplayText(thread)}
                  isSelected={selectedCommentId === thread.id}
                  isExpanded={expandedThreads.has(thread.id)}
                  replyText={replyText[thread.id] || ""}
                  editingMessage={editingMessage}
                  editText={editText}
                  onSelect={() => onSelectComment(thread.id)}
                  onToggleExpand={() => toggleExpanded(thread.id)}
                  onReplyTextChange={(text) =>
                    setReplyText((prev) => ({ ...prev, [thread.id]: text }))
                  }
                  onAddReply={() => handleAddReply(thread.id)}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onEditTextChange={setEditText}
                  onDeleteMessage={handleDeleteMessage}
                  onDeleteThread={handleDeleteThread}
                  onToggleResolve={handleToggleResolve}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Thread card component
interface ThreadCardProps {
  thread: CommentThread;
  displayText: string;
  isSelected: boolean;
  isExpanded: boolean;
  replyText: string;
  editingMessage: { threadId: string; messageId: string } | null;
  editText: string;
  onSelect: () => void;
  onToggleExpand: () => void;
  onReplyTextChange: (text: string) => void;
  onAddReply: () => void;
  onStartEdit: (threadId: string, message: CommentMessage) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditTextChange: (text: string) => void;
  onDeleteMessage: (threadId: string, messageId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onToggleResolve: (threadId: string) => void;
}

function ThreadCard({
  thread,
  displayText,
  isSelected,
  isExpanded,
  replyText,
  editingMessage,
  editText,
  onSelect,
  onToggleExpand,
  onReplyTextChange,
  onAddReply,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange,
  onDeleteMessage,
  onDeleteThread,
  onToggleResolve,
}: ThreadCardProps) {
  const firstMessage = thread.messages[0];
  const hasReplies = thread.messages.length > 1;

  return (
    <div
      className={cn(
        "p-4 transition-colors",
        isSelected ? "bg-muted/50" : "hover:bg-muted/30"
      )}
    >
      {/* Header: highlighted text + actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => {
            onSelect();
            onToggleExpand();
          }}
        >
          <div className="text-xs text-muted-foreground truncate">
            &ldquo;{displayText}&rdquo;
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onToggleResolve(thread.id)}
            className={cn(
              "p-1 rounded transition-colors",
              thread.resolved
                ? "text-green-600 hover:bg-green-100"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title={thread.resolved ? "Reopen" : "Resolve"}
          >
            {thread.resolved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onDeleteThread(thread.id)}
            className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-red-500"
            title="Delete thread"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* First message */}
      {firstMessage && (
        <MessageBubble
          message={firstMessage}
          threadId={thread.id}
          isEditing={
            editingMessage?.threadId === thread.id &&
            editingMessage?.messageId === firstMessage.id
          }
          editText={editText}
          onStartEdit={() => onStartEdit(thread.id, firstMessage)}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onEditTextChange={onEditTextChange}
          onDelete={() => onDeleteMessage(thread.id, firstMessage.id)}
          canDelete={thread.messages.length === 1}
        />
      )}

      {/* Reply count / expand toggle */}
      {hasReplies && !isExpanded && (
        <button
          onClick={onToggleExpand}
          className="text-xs text-muted-foreground hover:text-foreground mt-2"
        >
          {thread.messages.length - 1} repl
          {thread.messages.length - 1 === 1 ? "y" : "ies"}
        </button>
      )}

      {/* Expanded replies */}
      {isExpanded && hasReplies && (
        <div className="mt-3 space-y-3 pl-3 border-l-2 border-border">
          {thread.messages.slice(1).map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              threadId={thread.id}
              isEditing={
                editingMessage?.threadId === thread.id &&
                editingMessage?.messageId === message.id
              }
              editText={editText}
              onStartEdit={() => onStartEdit(thread.id, message)}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onEditTextChange={onEditTextChange}
              onDelete={() => onDeleteMessage(thread.id, message.id)}
              canDelete={true}
            />
          ))}
        </div>
      )}

      {/* Reply input (always visible when expanded or selected) */}
      {(isExpanded || isSelected) && !thread.resolved && (
        <div className="mt-3 flex items-end gap-2">
          <textarea
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            placeholder="Reply..."
            className="flex-1 px-3 py-2 text-sm bg-muted/50 border border-transparent focus:border-border rounded-md outline-none resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                onAddReply();
              }
            }}
          />
          <button
            onClick={onAddReply}
            disabled={!replyText.trim()}
            className="p-2 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// Message bubble component
interface MessageBubbleProps {
  message: CommentMessage;
  threadId: string;
  isEditing: boolean;
  editText: string;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditTextChange: (text: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}

function MessageBubble({
  message,
  isEditing,
  editText,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange,
  onDelete,
  canDelete,
}: MessageBubbleProps) {
  if (isEditing) {
    return (
      <div>
        <textarea
          value={editText}
          onChange={(e) => onEditTextChange(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-border resize-none"
          rows={3}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              onSaveEdit();
            }
            if (e.key === "Escape") {
              onCancelEdit();
            }
          }}
        />
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            onClick={onCancelEdit}
            className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={onSaveEdit}
            className="p-1.5 hover:bg-muted rounded transition-colors text-foreground"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
        {message.content}
      </p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">
          {formatTime(message.updatedAt)}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onStartEdit}
            className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-red-500"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
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
