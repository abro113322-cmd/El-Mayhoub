"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import { Saving } from "@/services/saving.service";
import { deleteSaving } from "@/services/saving.service";
import { useSavings } from "@/hooks/useSavings";

import DashboardLayout from "@/components/layout/DashboardLayout";
import SavingsTable from "@/components/savings/SavingsTable";
import AddSavingModal from "@/components/modals/AddSavingModal";

type Language = "en" | "ar";

export default function SavingsPage() {
  const [userId, setUserId] = useState("");

  const [openModal, setOpenModal] = useState(false);

  const [selectedSaving, setSelectedSaving] =
    useState<Saving | undefined>(undefined);

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
    savings,
    loading,
    reload,
  } = useSavings(userId);

  function handleAdd() {
    setSelectedSaving(undefined);
    setOpenModal(true);
  }

  function handleEdit(saving: Saving) {
    setSelectedSaving(saving);
    setOpenModal(true);
  }

  async function handleDelete(saving: Saving) {
    const ok = confirm(
      isArabic
        ? `هل تريد حذف "${saving.name}"؟`
        : `Delete "${saving.name}"?`
    );

    if (!ok) return;

    try {
      await deleteSaving(userId, saving.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete saving goal.");
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
              {isArabic
                ? "أهداف الادخار"
                : "Savings Goals"}
            </h1>

            <p className="text-slate-400 mt-2">
              {isArabic
                ? "تابع أهداف ادخارك وتقدمك"
                : "Track your saving goals and progress"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 transition px-6 py-3 rounded-xl font-semibold whitespace-nowrap"
          >
            {isArabic
              ? "+ إضافة هدف ادخار"
              : "+ Add Saving Goal"}
          </button>
        </div>

        <SavingsTable
          savings={savings}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <AddSavingModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setSelectedSaving(undefined);
        }}
        onSuccess={reload}
        saving={selectedSaving}
      />
    </DashboardLayout>
  );
}
