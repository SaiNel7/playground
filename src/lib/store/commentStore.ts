import { CommentThread, CommentMessage } from "@/lib/types";
import { generateId } from "@/lib/utils";

const STORAGE_KEY = "playground:comments";

// Helper: Read all threads from localStorage
function readFromStorage(): CommentThread[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : [];
    // Migrate old format if needed
    return parsed.map(migrateThread);
  } catch {
    console.error("Failed to read comments from localStorage");
    return [];
  }
}

// Migrate old comment format to new thread format
function migrateThread(item: any): CommentThread {
  // Already new format
  if (item.messages && Array.isArray(item.messages)) {
    return item as CommentThread;
  }

  // Old format: convert to new
  const now = Date.now();
  return {
    id: item.id,
    documentId: item.documentId,
    highlightedText: item.highlightedText || "",
    messages: item.content
      ? [
          {
            id: generateId(),
            content: item.content,
            author: "user",
            createdAt: item.createdAt || now,
            updatedAt: item.updatedAt || now,
          },
        ]
      : [],
    resolved: false,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now,
  };
}

// Helper: Write all threads to localStorage
function writeToStorage(threads: CommentThread[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch {
    console.error("Failed to write comments to localStorage");
  }
}

// Get all threads for a document (sorted by createdAt asc)
export function getDocumentComments(documentId: string): CommentThread[] {
  const threads = readFromStorage();
  return threads
    .filter((t) => t.documentId === documentId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

// Get a single thread by ID
export function getComment(id: string): CommentThread | null {
  const threads = readFromStorage();
  return threads.find((t) => t.id === id) || null;
}

// Create a new comment thread
export function createComment(
  documentId: string,
  content: string,
  highlightedText: string
): CommentThread {
  const now = Date.now();
  const newThread: CommentThread = {
    id: generateId(),
    documentId,
    highlightedText,
    messages: [
      {
        id: generateId(),
        content,
        author: "user",
        createdAt: now,
        updatedAt: now,
      },
    ],
    resolved: false,
    createdAt: now,
    updatedAt: now,
  };

  const threads = readFromStorage();
  threads.push(newThread);
  writeToStorage(threads);

  return newThread;
}

// Add a reply message to a thread
export function addReplyToThread(threadId: string, content: string): CommentMessage | null {
  const threads = readFromStorage();
  const index = threads.findIndex((t) => t.id === threadId);

  if (index === -1) return null;

  const now = Date.now();
  const newMessage: CommentMessage = {
    id: generateId(),
    content,
    author: "user",
    createdAt: now,
    updatedAt: now,
  };

  threads[index].messages.push(newMessage);
  threads[index].updatedAt = now;

  writeToStorage(threads);
  return newMessage;
}

// Update a message in a thread
export function updateMessage(threadId: string, messageId: string, content: string): void {
  const threads = readFromStorage();
  const threadIndex = threads.findIndex((t) => t.id === threadId);

  if (threadIndex === -1) return;

  const messageIndex = threads[threadIndex].messages.findIndex((m) => m.id === messageId);
  if (messageIndex === -1) return;

  const now = Date.now();
  threads[threadIndex].messages[messageIndex] = {
    ...threads[threadIndex].messages[messageIndex],
    content,
    updatedAt: now,
  };
  threads[threadIndex].updatedAt = now;

  writeToStorage(threads);
}

// Delete a message from a thread
export function deleteMessage(threadId: string, messageId: string): boolean {
  const threads = readFromStorage();
  const threadIndex = threads.findIndex((t) => t.id === threadId);

  if (threadIndex === -1) return false;

  const thread = threads[threadIndex];
  const newMessages = thread.messages.filter((m) => m.id !== messageId);

  // If no messages left, delete the entire thread
  if (newMessages.length === 0) {
    threads.splice(threadIndex, 1);
    writeToStorage(threads);
    return true; // Thread was deleted
  }

  threads[threadIndex].messages = newMessages;
  threads[threadIndex].updatedAt = Date.now();

  writeToStorage(threads);
  return false; // Thread still exists
}

// Resolve/unresolve a thread
export function toggleResolveThread(threadId: string): boolean {
  const threads = readFromStorage();
  const index = threads.findIndex((t) => t.id === threadId);

  if (index === -1) return false;

  threads[index].resolved = !threads[index].resolved;
  threads[index].updatedAt = Date.now();

  writeToStorage(threads);
  return threads[index].resolved;
}

// Legacy: Update a comment (updates first message)
export function updateComment(id: string, content: string): void {
  const threads = readFromStorage();
  const index = threads.findIndex((t) => t.id === id);

  if (index === -1) return;

  if (threads[index].messages.length > 0) {
    const now = Date.now();
    threads[index].messages[0] = {
      ...threads[index].messages[0],
      content,
      updatedAt: now,
    };
    threads[index].updatedAt = now;
  }

  writeToStorage(threads);
}

// Delete a thread
export function deleteComment(id: string): void {
  const threads = readFromStorage();
  const filtered = threads.filter((t) => t.id !== id);
  writeToStorage(filtered);
}

// Delete all threads for a document
export function deleteDocumentComments(documentId: string): void {
  const threads = readFromStorage();
  const filtered = threads.filter((t) => t.documentId !== documentId);
  writeToStorage(filtered);
}

// Subscribe to thread changes
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
