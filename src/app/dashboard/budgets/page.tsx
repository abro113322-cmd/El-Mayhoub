"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import { Budget } from "@/services/budget.service";
import { deleteBudget } from "@/services/budget.service";
import { useBudgets } from "@/hooks/useBudgets";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BudgetsTable from "@/components/budgets/BudgetsTable";
import AddBudgetModal from "@/components/modals/AddBudgetModal";

type Language = "en" | "ar";

export default function BudgetsPage() {
  const [userId, setUserId] = useState("");

  const [openModal, setOpenModal] = useState(false);

  const [selectedBudget, setSelectedBudget] =
    useState<Budget | undefined>(undefined);

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
    budgets,
    loading,
    reload,
  } = useBudgets(userId);

  function handleAdd() {
    setSelectedBudget(undefined);
    setOpenModal(true);
  }

  function handleEdit(budget: Budget) {
    setSelectedBudget(budget);
    setOpenModal(true);
  }

  async function handleDelete(budget: Budget) {
    const ok = confirm(
      isArabic
        ? `هل تريد حذف "${budget.name}"؟`
        : `Delete "${budget.name}"?`
    );

    if (!ok) return;

    try {
      await deleteBudget(userId, budget.id!);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete budget.");
      return;
    }

    reload();
  }

  return (
    <DashboardLayout>
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="space-y-8"
      >
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold">
              {isArabic ? "الميزانيات" : "Budgets"}
            </h1>

            <p className="text-slate-400 mt-2">
              {isArabic
                ? "إدارة ميزانياتك الشهرية"
                : "Manage your monthly budgets"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 transition px-6 py-3 rounded-xl font-semibold whitespace-nowrap"
          >
            {isArabic
              ? "+ إضافة ميزانية"
              : "+ Add Budget"}
          </button>
        </div>

        <BudgetsTable
          budgets={budgets}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <AddBudgetModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setSelectedBudget(undefined);
        }}
        onSuccess={reload}
        budget={selectedBudget}
      />
    </DashboardLayout>
  );
}