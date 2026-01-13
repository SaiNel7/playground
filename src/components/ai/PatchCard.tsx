"use client";

import { Check, X } from "lucide-react";
import { AIPatch } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PatchCardProps {
  patch: AIPatch;
  onAccept: () => void;
  onReject: () => void;
  disabled?: boolean;
}

export function PatchCard({ patch, onAccept, onReject, disabled }: PatchCardProps) {
  const isResolved = patch.status !== "open";
  const statusLabel = patch.status === "accepted" ? "Accepted" : patch.status === "rejected" ? "Rejected" : "Suggested Edit";

  return (
    <div className={cn(
      "mt-3 border rounded-md overflow-hidden",
      isResolved
        ? "border-border bg-muted/30 opacity-60"
        : "border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/10"
    )}>
      {/* Header */}
      <div className={cn(
        "px-3 py-2 border-b",
        isResolved
          ? "bg-muted/50 border-border"
          : "bg-purple-100/50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
      )}>
        <span className={cn(
          "text-xs font-medium",
          isResolved
            ? "text-muted-foreground"
            : "text-purple-700 dark:text-purple-300"
        )}>
          {statusLabel}
        </span>
      </div>

      {/* Proposed text */}
      <div className="px-3 py-2">
        <div className="text-sm text-foreground bg-white dark:bg-background px-3 py-2 rounded border border-border max-h-32 overflow-y-auto">
          {patch.proposedText}
        </div>
      </div>

      {/* Actions - only show for open patches */}
      {!isResolved && (
        <div className="px-3 py-2 flex items-center justify-end gap-2 bg-muted/30">
          <button
            onClick={onReject}
            disabled={disabled}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              "bg-red-600 text-white hover:bg-red-700",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <X className="w-4 h-4 inline-block mr-1 mb-0.5" />
            Reject
          </button>
          <button
            onClick={onAccept}
            disabled={disabled}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              "bg-green-600 text-white hover:bg-green-700",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Check className="w-4 h-4 inline-block mr-1 mb-0.5" />
            Accept
          </button>
        </div>
      )}
    </div>
  );
}
