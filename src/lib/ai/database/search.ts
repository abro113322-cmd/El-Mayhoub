import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

import { similarity } from "./helpers";

export async function findBestSaving(
  userId: string,
  keyword: string
) {
  const { data, error } = await supabase
    .from("savings")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  if (!data?.length) {
    return null;
  }

  let best = null;
  let bestScore = 0;

  for (const item of data) {
    const score = similarity(
      item.name,
      keyword
    );

    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  if (bestScore < 0.3) {
    return null;
  }

  return best;
}

export async function findBestBudget(
  userId: string,
  keyword: string
) {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  if (!data?.length) {
    return null;
  }

  let best = null;
  let bestScore = 0;

  for (const item of data) {
    const score = similarity(
      item.name,
      keyword
    );

    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  if (bestScore < 0.3) {
    return null;
  }

  return best;
}

export async function findBestTransaction(
  userId: string,
  keyword: string
) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  if (!data?.length) {
    return null;
  }

  let best = null;
  let bestScore = 0;

  for (const item of data) {
    const score = similarity(
      item.description ?? "",
      keyword
    );

    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  if (bestScore < 0.3) {
    return null;
  }

  return best;
}