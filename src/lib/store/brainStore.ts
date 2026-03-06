import { createClient } from "@/lib/supabase/client";
import type { ProjectBrain } from "@/lib/ai/schema";

const DEFAULT_BRAIN: ProjectBrain = {
  goal: "",
  constraints: [],
  glossary: [],
  decisions: [],
};

function dbToBrain(row: any): ProjectBrain {
  return {
    goal: row.goal || "",
    constraints: row.constraints || [],
    glossary: row.glossary || [],
    decisions: row.decisions || [],
  };
}

export async function getBrain(projectId: string): Promise<ProjectBrain> {
  const supabase = createClient();
  const { data } = await supabase
    .from("project_brains")
    .select("*")
    .eq("document_id", projectId)
    .single();
  return data ? dbToBrain(data) : { ...DEFAULT_BRAIN };
}

export async function saveBrain(projectId: string, brain: ProjectBrain): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("project_brains")
    .upsert(
      {
        document_id: projectId,
        user_id: user.id,
        goal: brain.goal,
        constraints: brain.constraints,
        glossary: brain.glossary,
        decisions: brain.decisions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "document_id" }
    );
}

async function mutateBrain(
  projectId: string,
  mutate: (brain: ProjectBrain) => ProjectBrain
): Promise<ProjectBrain> {
  const current = await getBrain(projectId);
  const updated = mutate(current);
  await saveBrain(projectId, updated);
  return updated;
}

export async function updateBrain(
  projectId: string,
  updates: Partial<ProjectBrain>
): Promise<ProjectBrain> {
  return mutateBrain(projectId, (brain) => ({ ...brain, ...updates }));
}

export async function addConstraint(projectId: string, constraint: string): Promise<ProjectBrain> {
  return mutateBrain(projectId, (brain) => ({
    ...brain,
    constraints: [...brain.constraints, constraint],
  }));
}

export async function removeConstraint(projectId: string, index: number): Promise<ProjectBrain> {
  return mutateBrain(projectId, (brain) => ({
    ...brain,
    constraints: brain.constraints.filter((_, i) => i !== index),
  }));
}

export async function addGlossaryTerm(
  projectId: string,
  term: string,
  definition: string
): Promise<ProjectBrain> {
  return mutateBrain(projectId, (brain) => ({
    ...brain,
    glossary: [...brain.glossary, { term, definition }],
  }));
}

export async function removeGlossaryTerm(projectId: string, index: number): Promise<ProjectBrain> {
  return mutateBrain(projectId, (brain) => ({
    ...brain,
    glossary: brain.glossary.filter((_, i) => i !== index),
  }));
}

export async function addDecision(projectId: string, text: string): Promise<ProjectBrain> {
  return mutateBrain(projectId, (brain) => ({
    ...brain,
    decisions: [...brain.decisions, { text, createdAt: Date.now() }],
  }));
}

export async function removeDecision(projectId: string, index: number): Promise<ProjectBrain> {
  return mutateBrain(projectId, (brain) => ({
    ...brain,
    decisions: brain.decisions.filter((_, i) => i !== index),
  }));
}

export async function deleteBrain(projectId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("project_brains").delete().eq("document_id", projectId);
}
