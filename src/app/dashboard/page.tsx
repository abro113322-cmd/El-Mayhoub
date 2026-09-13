"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import { setupUser } from "@/services/setup.service";

import {
  DashboardStats,
  getDashboardStats,
  getRecentTransactions,
} from "@/services/dashboard.service";

import DashboardLayout from "@/components/layout/DashboardLayout";
import RecentTransactions from "@/components/dashboard/RecentTransactions";

import { Transaction } from "@/services/transaction.service";

type Language = "en" | "ar";

export default function DashboardPage() {
  const [language, setLanguage] =
    useState<Language>("en");

  const [stats, setStats] =
    useState<DashboardStats>({
      totalIncome: 0,
      totalExpense: 0,
      totalBalance: 0,
      totalSavings: 0,
    });

  const [recentTransactions, setRecentTransactions] =
    useState<Transaction[]>([]);

  const [loading, setLoading] =
    useState(true);

  const isArabic =
    language === "ar";

  useEffect(() => {
    // =========================
    // Load saved language
    // =========================

    const savedLanguage =
      localStorage.getItem("language");

    if (
      savedLanguage === "ar" ||
      savedLanguage === "en"
    ) {
      setLanguage(savedLanguage);
    }

    // =========================
    // Listen for language changes
    // =========================

    const handleLanguageChange = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<Language>;

      if (
        customEvent.detail === "ar" ||
        customEvent.detail === "en"
      ) {
        setLanguage(
          customEvent.detail
        );
      }
    };

    window.addEventListener(
      "languageChanged",
      handleLanguageChange
    );

    return () => {
      window.removeEventListener(
        "languageChanged",
        handleLanguageChange
      );
    };
  }, []);

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          setLoading(false);
          return;
        }

        await setupUser();
        const dashboardStats = await getDashboardStats(user.id);
        const recent = await getRecentTransactions(user.id);

        setStats(dashboardStats);
        setRecentTransactions(recent);
      } catch (error) {
        console.error("Dashboard initialization failed:", error);
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, []);

  return (
    <DashboardLayout>
      <div
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
      >
        {/* =========================
            Statistics Cards
            ========================= */}

        <div className="grid md:grid-cols-4 gap-6">

          {/* Total Balance */}

          <div className="bg-slate-900 rounded-2xl p-6">
            <p className="text-slate-400">
              {isArabic
                ? "الرصيد الإجمالي"
                : "Total Balance"}
            </p>

            <h3
              dir="ltr"
              className={`text-4xl font-bold text-green-400 mt-3 ${
                isArabic
                  ? "text-right"
                  : "text-left"
              }`}
            >
              {loading
                ? "..."
                : `${stats.totalBalance.toFixed(
                    2
                  )} EGP`}
            </h3>
          </div>

          {/* Income */}

          <div className="bg-slate-900 rounded-2xl p-6">
            <p className="text-slate-400">
              {isArabic
                ? "الدخل"
                : "Income"}
            </p>

            <h3
              dir="ltr"
              className={`text-4xl font-bold text-blue-400 mt-3 ${
                isArabic
                  ? "text-right"
                  : "text-left"
              }`}
            >
              {loading
                ? "..."
                : `${stats.totalIncome.toFixed(
                    2
                  )} EGP`}
            </h3>
          </div>

          {/* Expenses */}

          <div className="bg-slate-900 rounded-2xl p-6">
            <p className="text-slate-400">
              {isArabic
                ? "المصروفات"
                : "Expenses"}
            </p>

            <h3
              dir="ltr"
              className={`text-4xl font-bold text-red-400 mt-3 ${
                isArabic
                  ? "text-right"
                  : "text-left"
              }`}
            >
              {loading
                ? "..."
                : `${stats.totalExpense.toFixed(
                    2
                  )} EGP`}
            </h3>
          </div>

          {/* Savings */}

          <div className="bg-slate-900 rounded-2xl p-6">
            <p className="text-slate-400">
              {isArabic
                ? "المدخرات"
                : "Savings"}
            </p>

            <h3
              dir="ltr"
              className={`text-4xl font-bold text-cyan-400 mt-3 ${
                isArabic
                  ? "text-right"
                  : "text-left"
              }`}
            >
              {loading
                ? "..."
                : `${stats.totalSavings.toFixed(
                    2
                  )} EGP`}
            </h3>
          </div>
        </div>

        {/* =========================
            Main Content
            ========================= */}

        <div className="mt-10">

          {/* Recent Transactions */}

          <div
            className={isArabic ? "text-right" : "text-left"}
          >
            <RecentTransactions
              transactions={
                recentTransactions
              }
            />
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}