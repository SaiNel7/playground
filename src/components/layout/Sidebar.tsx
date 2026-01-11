"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, Plus, Search, Trash2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Document } from "@/lib/types";
import {
  getAllDocuments,
  createDocument,
  deleteDocument,
  toggleStarDocument,
  subscribeToChanges,
} from "@/lib/store/documentStore";

interface SidebarProps {
  onOpenQuickSwitch?: () => void;
}

export function Sidebar({ onOpenQuickSwitch }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    docId: string;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Load documents from store
  const loadDocuments = useCallback(() => {
    const docs = getAllDocuments();
    setDocuments(docs);
    setIsLoaded(true);
  }, []);

  // Load on mount
  useEffect(() => {
    loadDocuments();

    // Subscribe to storage changes (cross-tab sync)
    const unsubscribe = subscribeToChanges(loadDocuments);
    return unsubscribe;
  }, [loadDocuments]);

  // Reload documents when pathname changes (new doc created)
  useEffect(() => {
    loadDocuments();
  }, [pathname, loadDocuments]);

  // Separate starred and non-starred documents
  const starredDocuments = useMemo(() => {
    return documents.filter((doc) => doc.starred);
  }, [documents]);

  const unstarredDocuments = useMemo(() => {
    return documents.filter((doc) => !doc.starred);
  }, [documents]);

  // Create new document and navigate
  const handleNewDocument = () => {
    const newDoc = createDocument({ title: "Untitled" });
    router.push(`/doc/${newDoc.id}`);
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, docId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      docId,
    });
  };

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle delete document
  const handleDeleteDocument = useCallback(
    (docId: string) => {
      const isCurrentDoc = pathname === `/doc/${docId}`;
      deleteDocument(docId);
      loadDocuments();
      closeContextMenu();

      // If deleting current document, navigate away
      if (isCurrentDoc) {
        const remainingDocs = getAllDocuments();
        if (remainingDocs.length > 0) {
          router.push(`/doc/${remainingDocs[0].id}`);
        } else {
          router.push("/");
        }
      }
    },
    [pathname, router, loadDocuments, closeContextMenu]
  );

  // Handle star/unstar document
  const handleToggleStar = useCallback(
    (docId: string) => {
      toggleStarDocument(docId);
      loadDocuments();
      closeContextMenu();
    },
    [loadDocuments, closeContextMenu]
  );

  // Get document by ID (for context menu)
  const getDocById = useCallback(
    (docId: string) => documents.find((d) => d.id === docId),
    [documents]
  );

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        closeContextMenu();
      }
    };

    if (contextMenu) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [contextMenu, closeContextMenu]);

  // Close context menu on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeContextMenu();
      }
    };

    if (contextMenu) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [contextMenu, closeContextMenu]);

  return (
    <aside className="w-60 h-screen bg-[#fbfbfa] border-r border-border flex flex-col">
      {/* Workspace header */}
      <div className="p-3 border-b border-border">
        <Link
          href="/"
          className="flex items-center px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors inline-block"
        >
          <span className="text-sm font-medium text-foreground">PLAYGROUND</span>
        </Link>
      </div>

      {/* Quick Switch button */}
      <div className="p-2">
        <button
          onClick={onOpenQuickSwitch}
          className="w-full flex items-center justify-between px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors"
        >
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span> Search  </span>
          </span>
          <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>

      {/* Documents list */}
      <div className="flex-1 overflow-auto px-2 flex flex-col">
        <div className="flex items-center justify-between px-2 py-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Documents
          </span>
          <button
            onClick={handleNewDocument}
            className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
            title="New document"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Empty state */}
        {isLoaded && documents.length === 0 && (
          <div className="px-2 py-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              No documents yet
            </p>
            <button
              onClick={handleNewDocument}
              className="text-sm text-foreground hover:underline"
            >
              Create your first document
            </button>
          </div>
        )}

        {/* Starred documents section */}
        {starredDocuments.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Starred
              </span>
            </div>
            <nav className="space-y-0.5">
              {starredDocuments.map((doc) => {
                const isActive = pathname === `/doc/${doc.id}`;
                return (
                  <Link
                    key={doc.id}
                    href={`/doc/${doc.id}`}
                    onContextMenu={(e) => handleContextMenu(e, doc.id)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{doc.title || "Untitled"}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* All documents section */}
        {unstarredDocuments.length > 0 && (
          <nav className="space-y-0.5 flex-1 overflow-auto">
            {starredDocuments.length > 0 && (
              <div className="px-2 py-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  All Documents
                </span>
              </div>
            )}
            {unstarredDocuments.map((doc) => {
              const isActive = pathname === `/doc/${doc.id}`;
              return (
                <Link
                  key={doc.id}
                  href={`/doc/${doc.id}`}
                  onContextMenu={(e) => handleContextMenu(e, doc.id)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{doc.title || "Untitled"}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white border border-border rounded-md shadow-lg py-1 min-w-[140px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={() => handleToggleStar(contextMenu.docId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors text-left"
          >
            {getDocById(contextMenu.docId)?.starred ? (
              <>
                <Star className="w-4 h-4" />
                <span>Unstar</span>
              </>
            ) : (
              <>
                <Star className="w-4 h-4" />
                <span>Star</span>
              </>
            )}
          </button>
          <button
            onClick={() => handleDeleteDocument(contextMenu.docId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-muted transition-colors text-left"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleNewDocument}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New document</span>
        </button>
      </div>
    </aside>
  );
}
