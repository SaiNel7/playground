import { createClient } from "@/lib/supabase/client";
import { CommentThread, CommentMessage } from "@/lib/types";
import type { AskAIMode } from "@/lib/ai/schema";

function dbToMessage(row: any): CommentMessage {
  return {
    id: row.id,
    content: row.content,
    author: row.author,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    status: row.status ?? undefined,
  };
}

function dbToThread(row: any): CommentThread {
  return {
    id: row.id,
    documentId: row.document_id,
    highlightedText: row.highlighted_text,
    messages: (row.messages || [])
      .map(dbToMessage)
      .sort((a: CommentMessage, b: CommentMessage) => a.createdAt - b.createdAt),
    resolved: row.resolved,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    isAIThread: row.is_ai_thread,
    aiMode: row.ai_mode ?? undefined,
  };
}

async function getUserId(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function getDocumentComments(documentId: string): Promise<CommentThread[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comment_threads")
    .select("*, messages:comment_messages(*)")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[commentStore] getDocumentComments:", error);
    return [];
  }
  return (data || []).map(dbToThread);
}

export async function getComment(id: string): Promise<CommentThread | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("comment_threads")
    .select("*, messages:comment_messages(*)")
    .eq("id", id)
    .single();
  return data ? dbToThread(data) : null;
}

export async function createComment(
  documentId: string,
  content: string,
  highlightedText: string
): Promise<CommentThread> {
  const supabase = createClient();
  const userId = await getUserId();

  const { data: thread, error: threadError } = await supabase
    .from("comment_threads")
    .insert({
      document_id: documentId,
      user_id: userId,
      highlighted_text: highlightedText,
      resolved: false,
      is_ai_thread: false,
    })
    .select()
    .single();
  if (threadError) throw threadError;

  const { data: message, error: msgError } = await supabase
    .from("comment_messages")
    .insert({
      thread_id: thread.id,
      document_id: documentId,
      user_id: userId,
      content,
      author: "user",
    })
    .select()
    .single();
  if (msgError) throw msgError;

  return dbToThread({ ...thread, messages: [message] });
}

export async function addReplyToThread(
  threadId: string,
  content: string
): Promise<CommentMessage | null> {
  const supabase = createClient();
  const userId = await getUserId();

  const { data: thread } = await supabase
    .from("comment_threads")
    .select("document_id")
    .eq("id", threadId)
    .single();
  if (!thread) return null;

  const { data: message, error } = await supabase
    .from("comment_messages")
    .insert({
      thread_id: threadId,
      document_id: thread.document_id,
      user_id: userId,
      content,
      author: "user",
    })
    .select()
    .single();
  if (error) {
    console.error("[commentStore] addReplyToThread:", error);
    return null;
  }

  await supabase
    .from("comment_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  return dbToMessage(message);
}

export async function updateMessage(
  threadId: string,
  messageId: string,
  content: string
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("comment_messages")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("thread_id", threadId);
  await supabase
    .from("comment_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);
}

export async function deleteMessage(
  threadId: string,
  messageId: string
): Promise<boolean> {
  const supabase = createClient();

  await supabase
    .from("comment_messages")
    .delete()
    .eq("id", messageId)
    .eq("thread_id", threadId);

  const { count } = await supabase
    .from("comment_messages")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", threadId);

  if ((count ?? 0) === 0) {
    await supabase.from("comment_threads").delete().eq("id", threadId);
    return true; // thread was deleted
  }

  await supabase
    .from("comment_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);
  return false;
}

export async function toggleResolveThread(threadId: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("comment_threads")
    .select("resolved")
    .eq("id", threadId)
    .single();
  const newResolved = !data?.resolved;
  await supabase
    .from("comment_threads")
    .update({ resolved: newResolved, updated_at: new Date().toISOString() })
    .eq("id", threadId);
  return newResolved;
}

export async function deleteComment(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("comment_threads").delete().eq("id", id);
}

export async function deleteDocumentComments(documentId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("comment_threads").delete().eq("document_id", documentId);
}

// ========================================
// AI Thread Functions
// ========================================

export async function createAIThread(
  documentId: string,
  highlightedText: string,
  mode: AskAIMode
): Promise<CommentThread> {
  const supabase = createClient();
  const userId = await getUserId();

  const { data: thread, error } = await supabase
    .from("comment_threads")
    .insert({
      document_id: documentId,
      user_id: userId,
      highlighted_text: highlightedText,
      resolved: false,
      is_ai_thread: true,
      ai_mode: mode,
    })
    .select()
    .single();
  if (error) throw error;

  return dbToThread({ ...thread, messages: [] });
}

export async function addUserPromptToAIThread(
  threadId: string,
  prompt: string
): Promise<CommentMessage | null> {
  const supabase = createClient();
  const userId = await getUserId();

  const { data: thread } = await supabase
    .from("comment_threads")
    .select("document_id")
    .eq("id", threadId)
    .single();
  if (!thread) return null;

  const { data: message, error } = await supabase
    .from("comment_messages")
    .insert({
      thread_id: threadId,
      document_id: thread.document_id,
      user_id: userId,
      content: prompt,
      author: "user",
    })
    .select()
    .single();
  if (error) return null;

  await supabase
    .from("comment_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  return dbToMessage(message);
}

export async function addAIMessageToThread(
  threadId: string,
  content: string,
  status: "pending" | "complete" | "error" = "complete"
): Promise<CommentMessage | null> {
  const supabase = createClient();
  const userId = await getUserId();

  const { data: thread } = await supabase
    .from("comment_threads")
    .select("document_id")
    .eq("id", threadId)
    .single();
  if (!thread) return null;

  const { data: message, error } = await supabase
    .from("comment_messages")
    .insert({
      thread_id: threadId,
      document_id: thread.document_id,
      user_id: userId,
      content,
      author: "ai",
      status,
    })
    .select()
    .single();
  if (error) return null;

  await supabase
    .from("comment_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  return dbToMessage(message);
}

export async function updateAIMessage(
  threadId: string,
  messageId: string,
  content: string,
  status: "pending" | "complete" | "error" = "complete"
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("comment_messages")
    .update({ content, status, updated_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("thread_id", threadId);
  await supabase
    .from("comment_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);
}

export async function updateAIThreadMode(threadId: string, mode: AskAIMode): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("comment_threads")
    .update({ ai_mode: mode, updated_at: new Date().toISOString() })
    .eq("id", threadId);
}
