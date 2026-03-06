"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search, Plus } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Document } from "@/lib/types";
import {
  getAllDocuments,
  createDocument,
} from "@/lib/store/documentStore";

interface QuickSwitchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickSwitch({ isOpen, onClose }: QuickSwitchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load documents
  const loadDocuments = useCallback(async () => {
    setDocuments(await getAllDocuments());
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Filter documents by query
  const filteredDocs = query.trim()
    ? documents.filter((doc) =>
        (doc.title || "Untitled").toLowerCase().includes(query.toLowerCase())
      )
    : documents;

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      loadDocuments();
      // Focus input after a tick
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, loadDocuments]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = filteredDocs.length + 1; // +1 for "New document" option

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex === filteredDocs.length) {
          // "New document" selected
          handleNewDocument();
        } else if (filteredDocs[selectedIndex]) {
          handleSelect(filteredDocs[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  // Navigate to selected document
  const handleSelect = (doc: Document) => {
    router.push(`/doc/${doc.id}`);
    onClose();
  };

  // Create new document
  const handleNewDocument = async () => {
    const newDoc = await createDocument({ title: query.trim() || "Untitled" });
    router.push(`/doc/${newDoc.id}`);
    onClose();
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[20vh]"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-2xl w-full max-w-lg overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-muted-foreground bg-muted rounded">
            esc
          </kbd>
        </div>

        {/* Results list */}
        <div className="max-h-[320px] overflow-y-auto py-1">
          {filteredDocs.length === 0 && query.trim() && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No documents found
            </div>
          )}

          {filteredDocs.map((doc, index) => (
            <button
              key={doc.id}
              onClick={() => handleSelect(doc)}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-2 text-left text-sm transition-colors",
                index === selectedIndex
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">{doc.title || "Untitled"}</span>
              <span className="text-xs text-muted-foreground/60">
                {formatRelativeTime(doc.updatedAt)}
              </span>
            </button>
          ))}

          {/* New document option */}
          <button
            onClick={handleNewDocument}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-2 text-left text-sm transition-colors border-t border-border mt-1",
              selectedIndex === filteredDocs.length
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">
              {query.trim() ? `Create "${query.trim()}"` : "New document"}
            </span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-muted-foreground bg-muted rounded">
              ↵
            </kbd>
          </button>
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded">↵</kbd> open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded">esc</kbd> close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
