import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

async function getOrCreateConversation(
  userId: string
) {
  const { data: conversation, error } =
    await supabase
      .from("ai_conversations")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (conversation) {
    return conversation.id;
  }

  const { data: created, error: createError } =
    await supabase
      .from("ai_conversations")
      .insert({
        user_id: userId,
        title: "AI Assistant",
      })
      .select("id")
      .single();

  if (createError) {
    throw createError;
  }

  return created.id;
}

export async function getConversationHistory(
  userId: string,
  limit = 10
) {
  const conversationId =
    await getOrCreateConversation(userId);

  const { data, error } =
    await supabase
      .from("ai_messages")
      .select("role, content")
      .eq(
        "conversation_id",
        conversationId
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).reverse();
}

export async function saveConversationMessage(
  userId: string,
  role: "user" | "assistant" | "system",
  content: string
) {
  const conversationId =
    await getOrCreateConversation(userId);

  const { error } =
    await supabase
      .from("ai_messages")
      .insert({
        conversation_id:
          conversationId,
        role,
        content,
      });

  if (error) {
    throw error;
  }
}