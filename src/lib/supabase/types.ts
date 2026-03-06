// Manual DB types matching the schema in supabase/migrations/001_initial_schema.sql
// Re-generate with: npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts

export type SubscriptionStatus = "free_trial" | "active" | "cancelled" | "expired";
export type AIPatchStatus = "open" | "accepted" | "rejected";
export type CommentAuthor = "user" | "ai";
export type MessageStatus = "pending" | "complete" | "error";
export type AIMode = "critique" | "synthesize";

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          subscription_status: SubscriptionStatus;
          trial_ends_at: string;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          subscription_status?: SubscriptionStatus;
          trial_ends_at?: string;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          subscription_status?: SubscriptionStatus;
          trial_ends_at?: string;
          stripe_customer_id?: string | null;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: Record<string, unknown>;
          starred: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          content?: Record<string, unknown>;
          starred?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: Record<string, unknown>;
          starred?: boolean;
          updated_at?: string;
        };
      };
      project_brains: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          goal: string;
          constraints: string[];
          glossary: Array<{ term: string; definition: string }>;
          decisions: Array<{ text: string; createdAt: number }>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_id: string;
          goal?: string;
          constraints?: string[];
          glossary?: Array<{ term: string; definition: string }>;
          decisions?: Array<{ text: string; createdAt: number }>;
        };
        Update: {
          goal?: string;
          constraints?: string[];
          glossary?: Array<{ term: string; definition: string }>;
          decisions?: Array<{ text: string; createdAt: number }>;
          updated_at?: string;
        };
      };
      comment_threads: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          highlighted_text: string;
          resolved: boolean;
          is_ai_thread: boolean;
          ai_mode: AIMode | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_id: string;
          highlighted_text?: string;
          resolved?: boolean;
          is_ai_thread?: boolean;
          ai_mode?: AIMode | null;
        };
        Update: {
          resolved?: boolean;
          updated_at?: string;
        };
      };
      comment_messages: {
        Row: {
          id: string;
          thread_id: string;
          document_id: string;
          user_id: string;
          content: string;
          author: CommentAuthor;
          status: MessageStatus | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          document_id: string;
          user_id: string;
          content: string;
          author: CommentAuthor;
          status?: MessageStatus | null;
        };
        Update: {
          content?: string;
          status?: MessageStatus | null;
          updated_at?: string;
        };
      };
      ai_patches: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          anchor_id: string;
          original_text: string;
          proposed_text: string;
          status: AIPatchStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_id: string;
          anchor_id: string;
          original_text: string;
          proposed_text: string;
          status?: AIPatchStatus;
        };
        Update: {
          status?: AIPatchStatus;
          updated_at?: string;
        };
      };
    };
  };
}
