"use client";

import { useEffect, useState } from "react";

type Language = "en" | "ar";

type Props = {
  search: string;
  setSearch: (v: string) => void;

  filter: string;
  setFilter: (v: string) => void;
};

export default function TransactionsToolbar({
  search,
  setSearch,
  filter,
  setFilter,
}: Props) {
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

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="flex flex-col md:flex-row gap-4 justify-between mb-6"
    >
      <input
        placeholder={
          isArabic
            ? "البحث عن معاملة..."
            : "Search transaction..."
        }
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-slate-900 rounded-xl px-4 py-3 w-full md:w-80 outline-none focus:ring-2 focus:ring-blue-500"
      />

      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="bg-slate-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">
          {isArabic ? "الكل" : "All"}
        </option>

        <option value="income">
          {isArabic ? "الدخل" : "Income"}
        </option>

        <option value="expense">
          {isArabic ? "مصروف" : "Expense"}
        </option>

        <option value="transfer">
          {isArabic ? "تحويل" : "Transfer"}
        </option>
      </select>
    </div>
  );
}