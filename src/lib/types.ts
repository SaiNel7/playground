export type Document = {
  id: string;
  title: string;
  content: any; // Tiptap JSON
  createdAt: number;
  updatedAt: number;
  starred?: boolean;
};

export type DocumentListItem = Pick<Document, "id" | "title" | "updatedAt">;

// Comment thread system types
export type CommentMessage = {
  id: string;
  content: string;
  author: string;
  createdAt: number;
  updatedAt: number;
};

export type CommentThread = {
  id: string;
  documentId: string;
  highlightedText: string; // The text that was highlighted when creating the thread
  messages: CommentMessage[];
  resolved: boolean;
  createdAt: number;
  updatedAt: number;
};

// Legacy alias for compatibility
export type Comment = CommentThread;
