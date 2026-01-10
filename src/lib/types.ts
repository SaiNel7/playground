export type Document = {
  id: string;
  title: string;
  content: any; // Tiptap JSON
  createdAt: number;
  updatedAt: number;
};

export type DocumentListItem = Pick<Document, "id" | "title" | "updatedAt">;

// Comment system types
export type Comment = {
  id: string;
  documentId: string;
  content: string;
  highlightedText: string; // The text that was highlighted when creating the comment
  createdAt: number;
  updatedAt: number;
};

export type CommentThread = {
  commentId: string;
  replies: CommentReply[];
};

export type CommentReply = {
  id: string;
  content: string;
  createdAt: number;
};
