"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useReports } from "@/hooks/useReports";

type Language = "en" | "ar";

export default function ReportsPage() {
  const [userId, setUserId] = useState("");
  const [language, setLanguage] = useState<Language>("en");

  const isArabic = language === "ar";

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language");

    if (savedLanguage === "ar" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }

    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<Language>;

      if (
        customEvent.detail === "ar" ||
        customEvent.detail === "en"
      ) {
        setLanguage(customEvent.detail);
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
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
      }
    }

    loadUser();
  }, []);

  const {
    stats,
    expensesChart,
    loading,
  } = useReports(userId);

  return (
    <DashboardLayout>
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="space-y-8"
      >
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">
            {isArabic ? "التقارير" : "Reports"}
          </h1>

          <p className="text-slate-400 mt-2">
            {isArabic
              ? "التقارير والتحليلات المالية"
              : "Financial reports and analytics"}
          </p>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-slate-900 rounded-2xl p-6">
            <p className="text-slate-400">
              {isArabic ? "إجمالي الدخل" : "Total Income"}
            </p>

            <h3 className="text-4xl font-bold text-green-400 mt-3">
              {loading
                ? "..."
                : `${stats.totalIncome.toFixed(2)} EGP`}
            </h3>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6">
            <p className="text-slate-400">
              {isArabic
                ? "إجمالي المصروفات"
                : "Total Expenses"}
            </p>

            <h3 className="text-4xl font-bold text-red-400 mt-3">
              {loading
                ? "..."
                : `${stats.totalExpense.toFixed(2)} EGP`}
            </h3>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6">
            <p className="text-slate-400">
              {isArabic
                ? "إجمالي المدخرات"
                : "Total Savings"}
            </p>

            <h3 className="text-4xl font-bold text-cyan-400 mt-3">
              {loading
                ? "..."
                : `${stats.totalSavings.toFixed(2)} EGP`}
            </h3>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6">
            <p className="text-slate-400">
              {isArabic ? "الرصيد" : "Balance"}
            </p>

            <h3 className="text-4xl font-bold text-blue-400 mt-3">
              {loading
                ? "..."
                : `${stats.totalBalance.toFixed(2)} EGP`}
            </h3>
          </div>
        </div>

        {/* Charts / Summary */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Expense by Category */}
          <div className="bg-slate-900 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">
              {isArabic
                ? "المصروفات حسب الفئة"
                : "Expense by Category"}
            </h2>

            {loading ? (
              <p className="text-slate-400">
                {isArabic
                  ? "جاري التحميل..."
                  : "Loading..."}
              </p>
            ) : expensesChart.length === 0 ? (
              <p className="text-slate-400">
                {isArabic
                  ? "لا توجد بيانات مصروفات متاحة."
                  : "No expense data available."}
              </p>
            ) : (
              <div className="space-y-5">
                {expensesChart.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">
                        {item.name}
                      </span>

                      <span className="text-red-400 font-bold">
                        {item.value.toFixed(2)} EGP
                      </span>
                    </div>

                    <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{
                          width: `${
                            stats.totalExpense === 0
                              ? 0
                              : (item.value /
                                  stats.totalExpense) *
                                100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Financial Summary */}
          <div className="bg-slate-900 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">
              {isArabic
                ? "الملخص المالي"
                : "Financial Summary"}
            </h2>

            <div className="space-y-5">
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {isArabic ? "الدخل" : "Income"}
                </span>

                <span className="text-green-400 font-bold">
                  {stats.totalIncome.toFixed(2)} EGP
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">
                  {isArabic ? "المصروفات" : "Expenses"}
                </span>

                <span className="text-red-400 font-bold">
                  {stats.totalExpense.toFixed(2)} EGP
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">
                  {isArabic ? "المدخرات" : "Savings"}
                </span>

                <span className="text-cyan-400 font-bold">
                  {stats.totalSavings.toFixed(2)} EGP
                </span>
              </div>

              <div className="border-t border-slate-700 pt-4 flex justify-between">
                <span className="font-semibold">
                  {isArabic ? "الرصيد" : "Balance"}
                </span>

                <span className="text-blue-400 font-bold">
                  {stats.totalBalance.toFixed(2)} EGP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}