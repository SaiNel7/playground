import { Comment } from "@/lib/types";
import { generateId } from "@/lib/utils";

const STORAGE_KEY = "playground:comments";

// Helper: Read all comments from localStorage
function readFromStorage(): Comment[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error("Failed to read comments from localStorage");
    return [];
  }
}

// Helper: Write all comments to localStorage
function writeToStorage(comments: Comment[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  } catch {
    console.error("Failed to write comments to localStorage");
  }
}

// Get all comments for a document (sorted by createdAt asc)
export function getDocumentComments(documentId: string): Comment[] {
  const comments = readFromStorage();
  return comments
    .filter((c) => c.documentId === documentId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

// Get a single comment by ID
export function getComment(id: string): Comment | null {
  const comments = readFromStorage();
  return comments.find((c) => c.id === id) || null;
}

// Create a new comment
export function createComment(
  documentId: string,
  content: string,
  highlightedText: string
): Comment {
  const now = Date.now();
  const newComment: Comment = {
    id: generateId(),
    documentId,
    content,
    highlightedText,
    createdAt: now,
    updatedAt: now,
  };

  const comments = readFromStorage();
  comments.push(newComment);
  writeToStorage(comments);

  return newComment;
}

// Update a comment
export function updateComment(id: string, content: string): void {
  const comments = readFromStorage();
  const index = comments.findIndex((c) => c.id === id);

  if (index === -1) return;

  comments[index] = {
    ...comments[index],
    content,
    updatedAt: Date.now(),
  };

  writeToStorage(comments);
}

// Delete a comment
export function deleteComment(id: string): void {
  const comments = readFromStorage();
  const filtered = comments.filter((c) => c.id !== id);
  writeToStorage(filtered);
}

// Delete all comments for a document
export function deleteDocumentComments(documentId: string): void {
  const comments = readFromStorage();
  const filtered = comments.filter((c) => c.documentId !== documentId);
  writeToStorage(filtered);
}

// Subscribe to comment changes
export function subscribeToCommentChanges(callback: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  return () => {};
}
