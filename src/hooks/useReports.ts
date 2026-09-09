"use client";

import { useEffect, useState } from "react";

import {
  ReportStats,
  getReportStats,
  getExpensesByCategory,
} from "@/services/report.service";

export function useReports(userId: string) {
  const [stats, setStats] = useState<ReportStats>({
    totalIncome: 0,
    totalExpense: 0,
    totalSavings: 0,
    totalBalance: 0,
  });

  const [expensesChart, setExpensesChart] = useState<
    {
      name: string;
      value: number;
    }[]
  >([]);

  const [loading, setLoading] = useState(true);

  async function load() {
    if (!userId) return;

    setLoading(true);

    try {
      const reportStats =
        await getReportStats(userId);

      const chart =
        await getExpensesByCategory(userId);

      setStats(reportStats);

      setExpensesChart(chart);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [userId]);

  return {
    stats,
    expensesChart,
    loading,
    reload: load,
  };
}