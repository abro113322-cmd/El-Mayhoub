import {
  getUserProfile,
  saveUserProfile,
} from "./services/profile";

export interface AIProfile {
  language: string;
  currency: string;
  tone: string;
  replyStyle: string;
  detailLevel: "low" | "medium" | "high";
  advisorEnabled: boolean;
  nickname?: string;
}

const DEFAULT_PROFILE: AIProfile = {
  language: "ar",
  currency: "EGP",
  tone: "friendly",
  replyStyle: "short",
  detailLevel: "medium",
  advisorEnabled: true,
};

export async function loadProfile(
  userId: string
): Promise<AIProfile> {
  const profile = await getUserProfile(userId);

  if (!profile) {
    return DEFAULT_PROFILE;
  }

  return {
    ...DEFAULT_PROFILE,
    ...profile,
  };
}

export async function updateProfile(
  userId: string,
  updates: Partial<AIProfile>
) {
  const current = await loadProfile(userId);

  const merged = {
    ...current,
    ...updates,
  };

  await saveUserProfile(userId, merged);

  return merged;
}