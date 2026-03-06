import { createClient } from "@/lib/supabase/client";
import { AIPatch, AIPatchStatus } from "@/lib/types";

function dbToPatch(row: any): AIPatch {
  return {
    id: row.id,
    documentId: row.document_id,
    anchorId: row.anchor_id,
    originalText: row.original_text,
    proposedText: row.proposed_text,
    status: row.status as AIPatchStatus,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function getPatches(documentId: string): Promise<AIPatch[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_patches")
    .select("*")
    .eq("document_id", documentId);
  if (error) {
    console.error("[patchStore] getPatches:", error);
    return [];
  }
  return (data || []).map(dbToPatch);
}

export async function getOpenPatchByAnchor(
  documentId: string,
  anchorId: string
): Promise<AIPatch | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ai_patches")
    .select("*")
    .eq("document_id", documentId)
    .eq("anchor_id", anchorId)
    .eq("status", "open")
    .single();
  return data ? dbToPatch(data) : null;
}

export async function createPatch(
  patch: Omit<AIPatch, "id" | "createdAt" | "updatedAt" | "status">
): Promise<AIPatch> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("ai_patches")
    .insert({
      document_id: patch.documentId,
      user_id: user.id,
      anchor_id: patch.anchorId,
      original_text: patch.originalText,
      proposed_text: patch.proposedText,
      status: "open",
    })
    .select()
    .single();

  if (error) throw error;
  return dbToPatch(data);
}

export async function updatePatch(
  documentId: string,
  patchId: string,
  updates: Partial<Omit<AIPatch, "id" | "documentId" | "createdAt">>
): Promise<AIPatch | null> {
  const supabase = createClient();
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.status !== undefined) updateData.status = updates.status;

  const { data, error } = await supabase
    .from("ai_patches")
    .update(updateData)
    .eq("id", patchId)
    .eq("document_id", documentId)
    .select()
    .single();
  if (error) {
    console.error("[patchStore] updatePatch:", error);
    return null;
  }
  return dbToPatch(data);
}

export async function deletePatch(documentId: string, patchId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("ai_patches")
    .delete()
    .eq("id", patchId)
    .eq("document_id", documentId);
}
