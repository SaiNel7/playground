"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Plus, Trash2, Brain as BrainIcon } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import {
  getBrain,
  saveBrain,
  addConstraint,
  removeConstraint,
  addGlossaryTerm,
  removeGlossaryTerm,
  addDecision,
  removeDecision,
} from "@/lib/store/brainStore";
import type { ProjectBrain } from "@/lib/ai/schema";

interface BrainPanelProps {
  projectId: string; // For v1, this is documentId
  isOpen: boolean;
  onClose: () => void;
}

export function BrainPanel({ projectId, isOpen, onClose }: BrainPanelProps) {
  const [brain, setBrain] = useState<ProjectBrain>(() => getBrain(projectId));
  const [localGoal, setLocalGoal] = useState(brain.goal);
  const [newConstraint, setNewConstraint] = useState("");
  const [newGlossaryTerm, setNewGlossaryTerm] = useState("");
  const [newGlossaryDef, setNewGlossaryDef] = useState("");
  const [newDecision, setNewDecision] = useState("");

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load brain when panel opens or projectId changes
  useEffect(() => {
    if (isOpen) {
      const loadedBrain = getBrain(projectId);
      setBrain(loadedBrain);
      setLocalGoal(loadedBrain.goal);
    }
  }, [isOpen, projectId]);

  // Debounced save for goal (typing doesn't feel laggy)
  const debouncedSaveGoal = useCallback(
    (goal: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        // Get the latest brain state from localStorage to avoid stale closures
        const currentBrain = getBrain(projectId);
        const updated = { ...currentBrain, goal };
        saveBrain(projectId, updated);
        setBrain(updated);
      }, 600);
    },
    [projectId]
  );

  const handleGoalChange = (value: string) => {
    setLocalGoal(value);
    debouncedSaveGoal(value);
  };

  // Constraint handlers
  const handleAddConstraint = () => {
    if (!newConstraint.trim()) return;
    const updated = addConstraint(projectId, newConstraint.trim());
    setBrain(updated);
    setNewConstraint("");
  };

  const handleRemoveConstraint = (index: number) => {
    const updated = removeConstraint(projectId, index);
    setBrain(updated);
  };

  // Glossary handlers
  const handleAddGlossaryTerm = () => {
    if (!newGlossaryTerm.trim() || !newGlossaryDef.trim()) return;
    const updated = addGlossaryTerm(
      projectId,
      newGlossaryTerm.trim(),
      newGlossaryDef.trim()
    );
    setBrain(updated);
    setNewGlossaryTerm("");
    setNewGlossaryDef("");
  };

  const handleRemoveGlossaryTerm = (index: number) => {
    const updated = removeGlossaryTerm(projectId, index);
    setBrain(updated);
  };

  // Decision handlers
  const handleAddDecision = () => {
    if (!newDecision.trim()) return;
    const updated = addDecision(projectId, newDecision.trim());
    setBrain(updated);
    setNewDecision("");
  };

  const handleRemoveDecision = (index: number) => {
    const updated = removeDecision(projectId, index);
    setBrain(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 h-full border-l border-border bg-background flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BrainIcon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Project Brain</span>
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
        <div className="p-4 space-y-6">
          {/* Goal Section */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">
              Goal
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              What is this piece trying to accomplish?
            </p>
            <textarea
              value={localGoal}
              onChange={(e) => handleGoalChange(e.target.value)}
              placeholder="e.g., Write a philosophy essay exploring Kant's categorical imperative..."
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md outline-none focus:ring-2 focus:ring-foreground/20 resize-none min-h-[80px]"
            />
          </div>

          {/* Constraints Section */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">
              Constraints
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Tone, audience, length, rules
            </p>

            {/* Constraint List */}
            {brain.constraints.length > 0 && (
              <div className="space-y-1 mb-2">
                {brain.constraints.map((constraint, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-muted/30 rounded-md group"
                  >
                    <span className="flex-1 text-sm">{constraint}</span>
                    <button
                      onClick={() => handleRemoveConstraint(index)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Constraint */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newConstraint}
                onChange={(e) => setNewConstraint(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddConstraint();
                }}
                placeholder="Add constraint..."
                className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <button
                onClick={handleAddConstraint}
                disabled={!newConstraint.trim()}
                className="p-1.5 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Glossary Section */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">
              Glossary
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Key terms and how they&apos;re defined in this document
            </p>

            {/* Glossary List */}
            {brain.glossary.length > 0 && (
              <div className="space-y-2 mb-3">
                {brain.glossary.map((entry, index) => (
                  <div
                    key={index}
                    className="p-2 bg-muted/30 rounded-md group space-y-1"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{entry.term}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.definition}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveGlossaryTerm(index)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Glossary Term */}
            <div className="space-y-2">
              <input
                type="text"
                value={newGlossaryTerm}
                onChange={(e) => setNewGlossaryTerm(e.target.value)}
                placeholder="Term..."
                className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-md outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGlossaryDef}
                  onChange={(e) => setNewGlossaryDef(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddGlossaryTerm();
                  }}
                  placeholder="Definition..."
                  className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md outline-none focus:ring-2 focus:ring-foreground/20"
                />
                <button
                  onClick={handleAddGlossaryTerm}
                  disabled={!newGlossaryTerm.trim() || !newGlossaryDef.trim()}
                  className="p-1.5 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Decisions Section */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">
              Past Decisions
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              &ldquo;We chose X because Y&rdquo;
            </p>

            {/* Decision List */}
            {brain.decisions.length > 0 && (
              <div className="space-y-2 mb-3">
                {brain.decisions.map((decision, index) => (
                  <div
                    key={index}
                    className="p-2 bg-muted/30 rounded-md group space-y-1"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="text-sm">{decision.text}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(decision.createdAt)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveDecision(index)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Decision */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newDecision}
                onChange={(e) => setNewDecision(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddDecision();
                }}
                placeholder="Add decision..."
                className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <button
                onClick={handleAddDecision}
                disabled={!newDecision.trim()}
                className="p-1.5 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Help Text */}
          <div className="p-3 bg-muted/20 rounded-md border border-border/50">
            <p className="text-xs text-muted-foreground">
              <BrainIcon className="inline w-3 h-3 mr-1" />
              The Project Brain is included in every AI request, helping the AI
              understand your goals and context.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
