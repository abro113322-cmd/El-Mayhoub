"use client";

import { useEffect, useState } from "react";

import {
  Saving,
  getSavings,
} from "@/services/saving.service";

export function useSavings(userId: string) {
  const [savings, setSavings] = useState<Saving[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!userId) return;

    setLoading(true);

    try {
      const data = await getSavings(userId);

      setSavings(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [userId]);

  return {
    savings,
    loading,
    reload: load,
  };
}