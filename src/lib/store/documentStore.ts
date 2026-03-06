import { createClient } from "@/lib/supabase/client";
import { Document } from "@/lib/types";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

function dbToDocument(row: any): Document {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    starred: row.starred,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function getAllDocuments(): Promise<Document[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[documentStore] getAllDocuments:", error);
    return [];
  }
  return (data || []).map(dbToDocument);
}

export async function getDocument(id: string): Promise<Document | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    console.error("[documentStore] getDocument:", error);
    return null;
  }
  return data ? dbToDocument(data) : null;
}

export async function createDocument(partial?: Partial<Document>): Promise<Document> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title: partial?.title ?? "Untitled",
      content: partial?.content ?? EMPTY_DOC,
      starred: partial?.starred ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return dbToDocument(data);
}

export async function updateDocument(id: string, updates: Partial<Document>): Promise<void> {
  const supabase = createClient();
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.starred !== undefined) updateData.starred = updates.starred;

  const { error } = await supabase
    .from("documents")
    .update(updateData)
    .eq("id", id);
  if (error) console.error("[documentStore] updateDocument:", error);
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) console.error("[documentStore] deleteDocument:", error);
}

export async function toggleStarDocument(id: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("documents")
    .select("starred")
    .eq("id", id)
    .single();
  const newStarred = !data?.starred;
  await supabase
    .from("documents")
    .update({ starred: newStarred, updated_at: new Date().toISOString() })
    .eq("id", id);
  return newStarred;
}
