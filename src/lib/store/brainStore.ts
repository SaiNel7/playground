// Project Brain persistence (localStorage-based)
// One brain per project (for v1, projectId = documentId)

import type { ProjectBrain } from "@/lib/ai/schema";

const STORAGE_KEY = "playground:brains";

/**
 * Read all brains from localStorage
 */
function readFromStorage(): Record<string, ProjectBrain> {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return {};

    const parsed = JSON.parse(data);

    // Migration: If data is an array (old bug), convert to empty object
    if (Array.isArray(parsed)) {
      console.warn('[brainStore] Found corrupted array data, resetting to empty object');
      return {};
    }

    return parsed;
  } catch {
    console.error("Failed to read brains from localStorage");
    return {};
  }
}

/**
 * Write all brains to localStorage
 */
function writeToStorage(brains: Record<string, ProjectBrain>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brains));
  } catch {
    console.error("Failed to write brains to localStorage");
  }
}

/**
 * Get default brain (empty state)
 */
function getDefaultBrain(): ProjectBrain {
  return {
    goal: "",
    constraints: [],
    glossary: [],
    decisions: [],
  };
}

/**
 * Get brain for a project.
 * Returns default brain if none exists.
 *
 * @param projectId - Project ID (for v1, use documentId)
 */
export function getBrain(projectId: string): ProjectBrain {
  const brains = readFromStorage();
  console.log('[brainStore] getBrain - all brains:', brains);
  console.log('[brainStore] getBrain - projectId:', projectId);
  console.log('[brainStore] getBrain - returning:', brains[projectId] || getDefaultBrain());
  return brains[projectId] || getDefaultBrain();
}

/**
 * Save brain for a project.
 *
 * @param projectId - Project ID (for v1, use documentId)
 * @param brain - Complete brain object
 */
export function saveBrain(projectId: string, brain: ProjectBrain): void {
  console.log('[brainStore] saveBrain - projectId:', projectId);
  console.log('[brainStore] saveBrain - brain:', brain);
  const brains = readFromStorage();
  brains[projectId] = brain;
  console.log('[brainStore] saveBrain - all brains after update:', brains);
  writeToStorage(brains);
}

/**
 * Update brain for a project (merge with existing).
 *
 * @param projectId - Project ID (for v1, use documentId)
 * @param updates - Partial brain updates
 * @returns Updated brain
 */
export function updateBrain(
  projectId: string,
  updates: Partial<ProjectBrain>
): ProjectBrain {
  const brains = readFromStorage();
  const current = brains[projectId] || getDefaultBrain();
  const updated = { ...current, ...updates };
  brains[projectId] = updated;
  writeToStorage(brains);
  return updated;
}

/**
 * Delete brain for a project.
 *
 * @param projectId - Project ID (for v1, use documentId)
 */
export function deleteBrain(projectId: string): void {
  const brains = readFromStorage();
  delete brains[projectId];
  writeToStorage(brains);
}

/**
 * Check if a brain exists for a project.
 *
 * @param projectId - Project ID (for v1, use documentId)
 */
export function hasBrain(projectId: string): boolean {
  const brains = readFromStorage();
  return projectId in brains;
}

/**
 * Add a decision to the brain.
 *
 * @param projectId - Project ID (for v1, use documentId)
 * @param text - Decision text
 */
export function addDecision(projectId: string, text: string): ProjectBrain {
  const brain = getBrain(projectId);
  const decision = {
    text,
    createdAt: Date.now(),
  };
  brain.decisions.push(decision);
  saveBrain(projectId, brain);
  return brain;
}

/**
 * Remove a decision from the brain by index.
 *
 * @param projectId - Project ID (for v1, use documentId)
 * @param index - Decision index to remove
 */
export function removeDecision(projectId: string, index: number): ProjectBrain {
  const brain = getBrain(projectId);
  brain.decisions.splice(index, 1);
  saveBrain(projectId, brain);
  return brain;
}

/**
 * Add a glossary term to the brain.
 *
 * @param projectId - Project ID (for v1, use documentId)
 * @param term - Term name
 * @param definition - Term definition
 */
export function addGlossaryTerm(
  projectId: string,
  term: string,
  definition: string
): ProjectBrain {
  const brain = getBrain(projectId);
  brain.glossary.push({ term, definition });
  saveBrain(projectId, brain);
  return brain;
}

/**
 * Remove a glossary term from the brain by index.
 *
 * @param projectId - Project ID (for v1, use documentId)
 * @param index - Glossary index to remove
 */
export function removeGlossaryTerm(
  projectId: string,
  index: number
): ProjectBrain {
  const brain = getBrain(projectId);
  brain.glossary.splice(index, 1);
  saveBrain(projectId, brain);
  return brain;
}

/**
 * Add a constraint to the brain.
 *
 * @param projectId - Project ID (for v1, use documentId)
 * @param constraint - Constraint text
 */
export function addConstraint(
  projectId: string,
  constraint: string
): ProjectBrain {
  const brain = getBrain(projectId);
  brain.constraints.push(constraint);
  saveBrain(projectId, brain);
  return brain;
}

/**
 * Remove a constraint from the brain by index.
 *
 * @param projectId - Project ID (for v1, use documentId)
 * @param index - Constraint index to remove
 */
export function removeConstraint(
  projectId: string,
  index: number
): ProjectBrain {
  const brain = getBrain(projectId);
  brain.constraints.splice(index, 1);
  saveBrain(projectId, brain);
  return brain;
}
