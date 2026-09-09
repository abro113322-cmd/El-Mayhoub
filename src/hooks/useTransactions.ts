"use client";

import { useEffect, useState } from "react";
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  Transaction,
} from "@/services/transaction.service";

export function useTransactions(userId: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTransactions() {
    if (!userId) return;

    setLoading(true);

    try {
      const data = await getTransactions(userId);
      setTransactions(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, [userId]);

  async function create(transaction: Transaction) {
    const data = await addTransaction(transaction);

    setTransactions((prev) => [data, ...prev]);

    return data;
  }

  async function update(
    id: string,
    transaction: Partial<Transaction>
  ) {
    const data = await updateTransaction(userId, id, transaction);

    setTransactions((prev) =>
      prev.map((item) =>
        item.id === id ? data : item
      )
    );

    return data;
  }

  async function remove(id: string) {
    await deleteTransaction(userId, id);

    setTransactions((prev) =>
      prev.filter((item) => item.id !== id)
    );
  }

  return {
    transactions,
    loading,
    create,
    update,
    remove,
    reload: loadTransactions,
  };
}
