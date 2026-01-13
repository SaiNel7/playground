import { AIPatch, AIPatchStatus } from "@/lib/types";

const STORAGE_KEY = "playground:patches:v2"; // v2 to avoid conflict with old array-based storage

// Storage structure: { [documentId]: AIPatch[] }
type PatchStorage = Record<string, AIPatch[]>;

// Get all patches for a document
export function getPatches(documentId: string): AIPatch[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const storage: PatchStorage = JSON.parse(stored);
    const patches = storage[documentId] || [];
    return patches;
  } catch (error) {
    console.error("[patchStore] Failed to get patches:", error);
    return [];
  }
}

// Get an open patch by anchor ID
export function getOpenPatchByAnchor(
  documentId: string,
  anchorId: string
): AIPatch | null {
  const patches = getPatches(documentId);
  return (
    patches.find((p) => p.anchorId === anchorId && p.status === "open") || null
  );
}

// Create a new patch
export function createPatch(
  patch: Omit<AIPatch, "id" | "createdAt" | "updatedAt" | "status">
): AIPatch {
  const now = Date.now();
  const newPatch: AIPatch = {
    ...patch,
    id: `patch_${now}_${Math.random().toString(36).substr(2, 9)}`,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storage: PatchStorage = stored ? JSON.parse(stored) : {};

    if (!storage[patch.documentId]) {
      storage[patch.documentId] = [];
    }

    storage[patch.documentId].push(newPatch);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));

    return newPatch;
  } catch (error) {
    console.error("[patchStore] Failed to create patch:", error);
    return newPatch;
  }
}

// Update a patch
export function updatePatch(
  documentId: string,
  patchId: string,
  updates: Partial<Omit<AIPatch, "id" | "documentId" | "createdAt">>
): AIPatch | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const storage: PatchStorage = JSON.parse(stored);
    const patches = storage[documentId];
    if (!patches) return null;

    const patchIndex = patches.findIndex((p) => p.id === patchId);
    if (patchIndex === -1) return null;

    const updatedPatch: AIPatch = {
      ...patches[patchIndex],
      ...updates,
      updatedAt: Date.now(),
    };

    patches[patchIndex] = updatedPatch;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));

    return updatedPatch;
  } catch (error) {
    console.error("[patchStore] Failed to update patch:", error);
    return null;
  }
}

// Delete a patch
export function deletePatch(documentId: string, patchId: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const storage: PatchStorage = JSON.parse(stored);
    const patches = storage[documentId];
    if (!patches) return;

    storage[documentId] = patches.filter((p) => p.id !== patchId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error("[patchStore] Failed to delete patch:", error);
  }
}
