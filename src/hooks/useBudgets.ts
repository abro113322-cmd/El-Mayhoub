"use client";

import { useEffect, useState } from "react";

import {
  Budget,
  getBudgets,
  addBudget,
  updateBudget,
  deleteBudget,
} from "@/services/budget.service";

export function useBudgets(userId: string) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadBudgets() {
    setLoading(true);

    try {
      const data = await getBudgets(userId);
      setBudgets(data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId) {
      loadBudgets();
    }
  }, [userId]);

  async function create(budget: Budget) {
    const data = await addBudget(budget);

    setBudgets((prev) => [data, ...prev]);
  }

  async function update(
    id: string,
    budget: Partial<Budget>
  ) {
    const data = await updateBudget(userId, id, budget);

    setBudgets((prev) =>
      prev.map((item) =>
        item.id === id ? data : item
      )
    );
  }

  async function remove(id: string) {
    await deleteBudget(userId, id);

    setBudgets((prev) =>
      prev.filter((item) => item.id !== id)
    );
  }

  return {
    budgets,
    loading,
    create,
    update,
    remove,
    reload: loadBudgets,
  };
}
