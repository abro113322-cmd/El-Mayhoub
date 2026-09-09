"use client";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type Language = "en" | "ar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const [language, setLanguage] =
    useState<Language>("en");

  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    setMounted(true);

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

        return;
      }

      const updatedLanguage =
        localStorage.getItem(
          "language"
        );

      if (
        updatedLanguage === "ar" ||
        updatedLanguage === "en"
      ) {
        setLanguage(
          updatedLanguage
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

  const isArabic =
    mounted && language === "ar";

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-[#050816] text-white flex"
    >
      {/* Sidebar */}

      <Sidebar />

      {/* Main Application */}

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />

        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}