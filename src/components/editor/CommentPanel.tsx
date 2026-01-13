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
  Sparkles,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CommentThread, CommentMessage } from "@/lib/types";
import {
  getDocumentComments,
  createComment,
  addReplyToThread,
  updateMessage,
  deleteMessage,
  deleteComment,
  toggleResolveThread,
  addUserPromptToAIThread,
  addAIMessageToThread,
  updateAIMessage,
} from "@/lib/store/commentStore";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useEditorContext } from "@/lib/EditorContext";
import { AskAIComposer } from "@/components/ai/AskAIComposer";
import { PatchCard } from "@/components/ai/PatchCard";
import { buildContextPack } from "@/lib/contextExtractor";
import { getBrain } from "@/lib/store/brainStore";
import { getPatches, getOpenPatchByAnchor, createPatch, updatePatch } from "@/lib/store/patchStore";
import { findAnchorRange } from "@/lib/anchors/findAnchorRange";
import type { AskAIMode, AskAIRequest, AskAIResponse } from "@/lib/ai/schema";
import type { AIPatch } from "@/lib/types";

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
  const [aiLoading, setAILoading] = useState<Record<string, boolean>>({});
  const [patches, setPatches] = useState<Record<string, AIPatch>>({});
  const [panelWidth, setPanelWidth] = useState(() => {
    // Load saved width from localStorage, default to 320px (w-80)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('playground:commentPanelWidth');
      return saved ? parseInt(saved, 10) : 320;
    }
    return 320;
  });
  const [isResizing, setIsResizing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { editorMethods } = useEditorContext();

  // Get live data (text + position) from the editor and clean up orphaned threads
  const refreshCommentData = useCallback(() => {
    if (!editorMethods?.getAllCommentData) return;

    const data = editorMethods.getAllCommentData();
    setCommentData(data);

    // Check for orphaned threads (exist in storage but not in editor)
    // NOTE: Exclude AI threads from orphan cleanup since they don't have marks in the editor
    const storedThreads = getDocumentComments(documentId);
    const orphanedThreads = storedThreads.filter((thread) => !thread.isAIThread && !data[thread.id]);

    // Delete orphaned threads
    if (orphanedThreads.length > 0) {
      orphanedThreads.forEach((thread) => {
        deleteComment(thread.id);
        onDeleteComment(thread.id);
      });
      // Reload threads after cleanup
      setThreads(getDocumentComments(documentId));
    }
  }, [documentId, onDeleteComment, editorMethods]);

  // Load patches for all threads
  const loadPatches = useCallback(() => {
    const allPatches = getPatches(documentId);
    const patchMap: Record<string, AIPatch> = {};
    allPatches.forEach((patch) => {
      patchMap[patch.anchorId] = patch;
    });
    setPatches(patchMap);
  }, [documentId]);

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

  // Load patches when threads change
  useEffect(() => {
    if (isOpen && threads.length > 0) {
      loadPatches();
    }
  }, [isOpen, threads, loadPatches]);

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

  // Separate AI threads awaiting prompt, regular unresolved, and resolved
  const aiThreadsAwaitingPrompt = sortedThreads.filter((t) => t.isAIThread && t.messages.length === 0);
  const unresolvedThreads = sortedThreads.filter((t) => !t.resolved && !(t.isAIThread && t.messages.length === 0));
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
      setExpandedThreads((prev) => new Set([...Array.from(prev), selectedCommentId]));
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
    editorMethods?.applyCommentMark(thread.id);

    onAddComment();
    setNewCommentText("");
    setExpandedThreads((prev) => new Set([...Array.from(prev), thread.id]));
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
      editorMethods?.removeCommentMark(threadId);
      onDeleteComment(threadId);
    }

    loadThreads();
  };

  // Handle deleting an entire thread
  const handleDeleteThread = (threadId: string) => {
    deleteComment(threadId);

    // Remove the comment mark in the editor
    editorMethods?.removeCommentMark(threadId);

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

  // Handle accepting a patch
  const handleAcceptPatch = useCallback((threadId: string, patch: AIPatch) => {
    const editor = editorMethods?.getEditorInstance();
    if (!editor) {
      console.error("[Patch] Editor instance not available");
      return;
    }

    // First try to find the range via comment mark
    let range = findAnchorRange(editor, threadId);

    // If no mark found, search for the original text in the document
    if (!range) {
      const docText = editor.getText();
      const searchText = patch.originalText.trim();
      const index = docText.indexOf(searchText);

      if (index !== -1) {
        // Convert character index to ProseMirror position
        range = { from: index + 1, to: index + 1 + searchText.length };
      } else {
        console.error("[Patch] Could not find original text in document");
        alert("Could not find the original text in the document. It may have been edited.");
        return;
      }
    }

    // Replace the text with proposedText
    editor
      .chain()
      .focus()
      .setTextSelection({ from: range.from, to: range.to })
      .insertContent(patch.proposedText)
      .unsetComment()
      .run();

    // Update patch status and mark thread as resolved
    updatePatch(documentId, patch.id, { status: "accepted" });
    toggleResolveThread(threadId);

    // Reload patches to update UI
    loadPatches();
    loadThreads();
  }, [documentId, editorMethods, loadThreads, loadPatches]);

  // Handle rejecting a patch
  const handleRejectPatch = useCallback((threadId: string, patch: AIPatch) => {
    const editor = editorMethods?.getEditorInstance();
    if (!editor) {
      console.error("[Patch] Editor instance not available");
      return;
    }

    // Find and remove the comment mark (optional but recommended)
    const range = findAnchorRange(editor, threadId);
    if (range) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: range.from, to: range.to })
        .unsetComment()
        .run();
    }

    // Update patch status to rejected
    updatePatch(documentId, patch.id, { status: "rejected" });

    // Mark the thread as resolved
    toggleResolveThread(threadId);

    // Reload patches to update UI
    loadPatches();
    loadThreads();
  }, [documentId, editorMethods, loadThreads, loadPatches]);

  // Handle sending AI prompt
  const handleSendAIPrompt = useCallback(async (threadId: string, prompt: string, mode: AskAIMode) => {
    console.log("[CommentPanel] handleSendAIPrompt called:", { threadId, promptLength: prompt.length, mode });
    try {
      // Get editor instance
      const editor = editorMethods?.getEditorInstance();
      if (!editor) {
        console.error("[AI] Editor instance not available");
        return;
      }

      // Add user's prompt to thread
      addUserPromptToAIThread(threadId, prompt);
      loadThreads();

      // Set loading state
      setAILoading((prev) => ({ ...prev, [threadId]: true }));

      // Add pending AI message
      const aiMessage = addAIMessageToThread(threadId, "", "pending");
      if (!aiMessage) {
        console.error("[AI] Failed to create AI message");
        setAILoading((prev) => ({ ...prev, [threadId]: false }));
        return;
      }

      // Reload threads to show the pending message
      loadThreads();

      // Build context pack
      const contextPack = buildContextPack(editor, { includeFullDoc: false });

      // Get project brain
      const brain = getBrain(documentId);

      // Build AI request
      const request: AskAIRequest = {
        mode,
        userPrompt: prompt,
        context: contextPack,
        brain,
        meta: {
          documentId,
          anchorId: threadId,
        },
      };

      // Call AI API
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`AI API returned ${response.status}`);
      }

      const data: AskAIResponse = await response.json();

      // Get the thread BEFORE reloading (to access highlightedText)
      const thread = threads.find((t) => t.id === threadId);

      // Update AI message with response
      updateAIMessage(threadId, aiMessage.id, data.message, "complete");
      loadThreads();

      // If proposedText is provided (synthesize mode), create a patch
      if (data.proposedText && mode === "synthesize" && thread) {
        createPatch({
          documentId,
          anchorId: threadId,
          originalText: thread.highlightedText,
          proposedText: data.proposedText,
        });
        loadPatches();
      }
    } catch (error: any) {
      console.error("[AI] Request failed:", error);

      // Find the AI message to update with error
      const thread = threads.find((t) => t.id === threadId);
      if (thread) {
        const aiMsg = thread.messages.find((m) => m.author === "ai" && m.status === "pending");
        if (aiMsg) {
          const errorMessage = error.message?.includes("API returned")
            ? `AI request failed (${error.message}). Please check your API key and try again.`
            : "AI request failed. Please try again.";
          updateAIMessage(threadId, aiMsg.id, errorMessage, "error");
          loadThreads();
        }
      }
    } finally {
      setAILoading((prev) => ({ ...prev, [threadId]: false }));
    }
  }, [documentId, editorMethods, threads, loadThreads]);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    // Calculate new width based on distance from right edge of viewport
    const newWidth = window.innerWidth - e.clientX;

    // Constrain width between 280px (min) and 800px (max)
    const constrainedWidth = Math.min(Math.max(newWidth, 280), 800);
    setPanelWidth(constrainedWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add global mouse event listeners for resize
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Save panel width to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('playground:commentPanelWidth', panelWidth.toString());
    }
  }, [panelWidth]);

  if (!isOpen) return null;

  return (
    <div
      className="h-full border-l border-border bg-background flex flex-col flex-shrink-0 overflow-hidden relative"
      style={{ width: `${panelWidth}px` }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 bottom-0 w-3 -ml-1.5 cursor-col-resize z-10 group"
        title="Drag to resize"
      >
        {/* Thin visual indicator */}
        <div className={cn(
          "absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-purple-400 transition-colors",
          isResizing && "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
        )} />
      </div>
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

        {/* AI threads awaiting prompt */}
        {aiThreadsAwaitingPrompt.map((thread) => (
            <div
              key={thread.id}
              className={cn(
                "p-4 border-b border-border",
                selectedCommentId === thread.id ? "bg-muted/50" : "bg-muted/30"
              )}
            >
              <div className="flex items-start gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">
                    Ask AI about:
                  </div>
                  <div className="text-sm bg-purple-100/50 dark:bg-purple-900/20 px-2 py-1 rounded italic break-words">
                    &ldquo;{getDisplayText(thread)}&rdquo;
                  </div>
                </div>
              </div>
              <AskAIComposer
                onSend={(prompt, mode) => handleSendAIPrompt(thread.id, prompt, mode)}
                onCancel={() => handleDeleteThread(thread.id)}
                autoFocus={selectedCommentId === thread.id}
                disabled={aiLoading[thread.id]}
              />
            </div>
          ))}

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
            {unresolvedThreads.map((thread) => {
              const threadPatch = patches[thread.id] || null;
              return (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  displayText={getDisplayText(thread)}
                  isSelected={selectedCommentId === thread.id}
                  isExpanded={expandedThreads.has(thread.id)}
                  replyText={replyText[thread.id] || ""}
                  editingMessage={editingMessage}
                  editText={editText}
                  patch={threadPatch}
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
                onAcceptPatch={handleAcceptPatch}
                onRejectPatch={handleRejectPatch}
              />
            );
            })}
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
                  patch={patches[thread.id] || null}
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
                  onAcceptPatch={handleAcceptPatch}
                  onRejectPatch={handleRejectPatch}
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
  patch?: AIPatch | null; // Optional patch for this thread
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
  onAcceptPatch?: (threadId: string, patch: AIPatch) => void;
  onRejectPatch?: (threadId: string, patch: AIPatch) => void;
}

function ThreadCard({
  thread,
  displayText,
  isSelected,
  isExpanded,
  replyText,
  editingMessage,
  editText,
  patch,
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
  onAcceptPatch,
  onRejectPatch,
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
            disabled={patch && patch.status !== "open"}
            className={cn(
              "p-1 rounded transition-colors",
              patch && patch.status !== "open"
                ? "opacity-50 cursor-not-allowed text-muted-foreground"
                : thread.resolved
                ? "text-green-600 hover:bg-green-100"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title={
              patch && patch.status !== "open"
                ? "Cannot unresolve after accepting/rejecting patch"
                : thread.resolved
                ? "Reopen"
                : "Resolve"
            }
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

      {/* Patch suggestion card (if available) */}
      {patch && onAcceptPatch && onRejectPatch && (
        <PatchCard
          patch={patch}
          onAccept={() => onAcceptPatch(thread.id, patch)}
          onReject={() => onRejectPatch(thread.id, patch)}
        />
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
  const isAI = message.author === "ai";
  const isPending = message.status === "pending";
  const isError = message.status === "error";

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
      {/* AI loading state */}
      {isAI && isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Thinking...</span>
        </div>
      )}

      {/* Regular message content */}
      {(!isAI || !isPending) && (
        <div className={cn(
          "text-sm break-words",
          isAI && "bg-purple-50/50 dark:bg-purple-900/10 px-3 py-2 rounded-md",
          isError && "text-red-500",
          !isAI && "whitespace-pre-wrap"
        )}>
          {isAI && <Sparkles className="w-3 h-3 inline-block mr-1 mb-0.5 text-purple-500" />}
          {isAI ? (
            <div className="inline">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <span>{children}</span>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            message.content
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">
          {isAI ? "AI" : "You"} · {formatRelativeTime(message.updatedAt)}
        </span>
        {/* Only allow editing/deleting user messages */}
        {!isAI && (
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
        )}
      </div>
    </div>
  );
}

