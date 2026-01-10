"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { MessageSquarePlus } from "lucide-react";

interface SelectionBubbleProps {
  editor: Editor | null;
  onAddComment: (text: string) => void;
}

export function SelectionBubble({ editor, onAddComment }: SelectionBubbleProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const isClickingRef = useRef(false);

  const updatePosition = useCallback(() => {
    if (!editor) {
      setPosition(null);
      return;
    }

    const { from, to } = editor.state.selection;
    
    // No selection or cursor only
    if (from === to) {
      setPosition(null);
      setSelectedText("");
      return;
    }

    // Get selection text
    const text = editor.state.doc.textBetween(from, to);
    
    // Don't show for very short selections
    if (text.trim().length < 2) {
      setPosition(null);
      setSelectedText("");
      return;
    }

    setSelectedText(text);

    // Get the DOM selection to position the bubble
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setPosition(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Position bubble above the selection, centered
    setPosition({
      top: rect.top + window.scrollY - 45,
      left: rect.left + window.scrollX + rect.width / 2,
    });
  }, [editor]);

  // Listen for selection changes
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      // Small delay to let the DOM update
      setTimeout(updatePosition, 10);
    };

    const handleBlur = () => {
      // Don't hide if we're clicking the comment button
      if (isClickingRef.current) return;
      setPosition(null);
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    editor.on("blur", handleBlur);

    // Also listen for mouse up to catch drag selections
    const handleMouseUp = (e: MouseEvent) => {
      // Don't update position if clicking on the bubble itself
      const target = e.target as HTMLElement;
      if (target.closest('[data-selection-bubble]')) return;
      setTimeout(updatePosition, 10);
    };
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
      editor.off("blur", handleBlur);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [editor, updatePosition]);

  // Hide on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (position) {
        updatePosition();
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [position, updatePosition]);

  const handleClick = useCallback(() => {
    if (selectedText) {
      onAddComment(selectedText);
      setPosition(null);
      setSelectedText("");
    }
    isClickingRef.current = false;
  }, [selectedText, onAddComment]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Prevent editor blur
    e.preventDefault();
    isClickingRef.current = true;
  }, []);

  if (!position) return null;

  return (
    <div
      data-selection-bubble
      className="fixed z-50 -translate-x-1/2 animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <button
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-full shadow-lg hover:bg-foreground/90 transition-colors"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span>Comment</span>
      </button>
    </div>
  );
}
