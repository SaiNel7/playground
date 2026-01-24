"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Star, Trash2, Brain } from "lucide-react";

interface TopbarProps {
  title?: string;
  starred?: boolean;
  onToggleStar?: () => void;
  onDelete?: () => void;
  onToggleBrain?: () => void;
  isBrainOpen?: boolean;
}

export function Topbar({ title, starred, onToggleStar, onDelete, onToggleBrain, isBrainOpen }: TopbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [isMenuOpen]);

  // Close menu on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isMenuOpen]);

  const handleDelete = () => {
    setIsMenuOpen(false);
    onDelete?.();
  };

  return (
    <div className="h-11 flex items-center justify-between px-3 border-b border-transparent hover:border-border transition-colors">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        {/* Breadcrumb placeholder */}
        <span className="hover:bg-muted px-1.5 py-0.5 rounded cursor-pointer transition-colors">
          {title || "Untitled"}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleBrain}
          className={`p-1.5 hover:bg-muted rounded transition-colors ${
            isBrainOpen
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Project Brain"
        >
          <Brain className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleStar}
          className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
          title={starred ? "Remove from starred" : "Add to starred"}
        >
          <Star className={starred ? "w-4 h-4 fill-amber-500 text-amber-500" : "w-4 h-4"} />
        </button>
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          
          {/* Dropdown menu */}
          {isMenuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 top-full mt-1 z-50 bg-white border border-border rounded-md shadow-lg py-1 min-w-[140px]"
            >
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-muted transition-colors text-left"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
