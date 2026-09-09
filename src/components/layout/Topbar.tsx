"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Language = "en" | "ar";

export default function Topbar() {
  const router = useRouter();

  const [isDark, setIsDark] = useState(true);
  const [language, setLanguage] =
    useState<Language>("en");

  const [englishName, setEnglishName] =
    useState("User");

  const [arabicName, setArabicName] =
    useState("مستخدم");

  const [loggingOut, setLoggingOut] =
    useState(false);

  useEffect(() => {
    // =========================
    // Theme
    // =========================

    const savedTheme =
      localStorage.getItem("theme");

    if (savedTheme === "light") {
      setIsDark(false);

      document.documentElement.classList.add(
        "light"
      );
    } else {
      setIsDark(true);

      document.documentElement.classList.remove(
        "light"
      );
    }

    // =========================
    // Language
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
    // Load current profile
    // =========================

    async function loadProfile() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          return;
        }

        const {
          data: profile,
          error,
        } = await supabase
          .from("profiles")
          .select(
            "full_name, username, email, language"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error(
            "Topbar profile loading error:",
            error
          );

          return;
        }

        // =========================
        // English name
        // =========================

        const displayName =
          profile?.full_name?.trim() ||
          profile?.username?.trim() ||
          profile?.email?.trim() ||
          user.email?.trim() ||
          "User";

        setEnglishName(displayName);

        // =========================
        // Arabic name
        // =========================

        const normalizedName =
          displayName
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

        if (
          normalizedName ===
            "abdulrahman elmayhoub" ||
          normalizedName ===
            "abdulrahman el mayhoub"
        ) {
          setArabicName(
            "عبدالرحمن الميهوب"
          );
        } else {
          setArabicName(displayName);
        }

        // =========================
        // Profile language
        // =========================

        if (
          profile?.language === "ar" ||
          profile?.language === "en"
        ) {
          const savedCurrentLanguage =
            localStorage.getItem("language");

          // Keep the latest local selection
          // instead of overwriting it with
          // an older profile value.
          if (
            savedCurrentLanguage === "ar" ||
            savedCurrentLanguage === "en"
          ) {
            setLanguage(savedCurrentLanguage);
          } else {
            setLanguage(profile.language);

            localStorage.setItem(
              "language",
              profile.language
            );
          }
        }
      } catch (error) {
        console.error(
          "Topbar profile initialization error:",
          error
        );
      }
    }

    void loadProfile();

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
        setLanguage(customEvent.detail);

        localStorage.setItem(
          "language",
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

  // =========================
  // Theme
  // =========================

  const toggleTheme = () => {
    const nextTheme = isDark
      ? "light"
      : "dark";

    setIsDark(!isDark);

    localStorage.setItem(
      "theme",
      nextTheme
    );

    if (nextTheme === "light") {
      document.documentElement.classList.add(
        "light"
      );
    } else {
      document.documentElement.classList.remove(
        "light"
      );
    }

    window.dispatchEvent(
      new CustomEvent("themeChanged", {
        detail: nextTheme,
      })
    );
  };

  // =========================
  // Language
  // =========================

  const toggleLanguage = async () => {
    const nextLanguage: Language =
      language === "en"
        ? "ar"
        : "en";

    // Change UI immediately
    setLanguage(nextLanguage);

    // Save locally immediately
    localStorage.setItem(
      "language",
      nextLanguage
    );

    // Notify the rest of the dashboard
    window.dispatchEvent(
      new CustomEvent(
        "languageChanged",
        {
          detail: nextLanguage,
        }
      )
    );

    // Save preference to Supabase
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { error } =
        await supabase
          .from("profiles")
          .update({
            language: nextLanguage,
          })
          .eq("id", user.id);

      if (error) {
        console.error(
          "Language update error:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Language save failed:",
        error
      );
    }
  };

  // =========================
  // Logout
  // =========================

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Logout error:",
          error
        );

        setLoggingOut(false);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );

      setLoggingOut(false);
    }
  };

  // =========================
  // Current language
  // =========================

  const isArabic =
    language === "ar";

  // =========================
  // Display name
  // =========================

  const displayName = isArabic
    ? arabicName
    : englishName;

  // =========================
  // Avatar
  // =========================

  const avatarInitial = isArabic
    ? "أ"
    : englishName
        .charAt(0)
        .toUpperCase();

  // =========================
  // Language button
  //
  // English page -> Arabic
  // Arabic page  -> إنجليزي
  // =========================

  const languageButtonLabel =
    isArabic
      ? "إنجليزي"
      : "Arabic";

  return (
    <header className="flex items-center justify-between gap-6 border-b border-slate-800 px-8 py-5">
      {/* =========================
          Page Title
          ========================= */}

      <div
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
        className={`min-w-0 flex-1 ${
          isArabic
            ? "text-right"
            : "text-left"
        }`}
      >
        <h2 className="text-2xl font-bold text-white">
          {isArabic
            ? "لوحة التحكم"
            : "Dashboard"}
        </h2>

        <p className="text-sm text-slate-400 mt-1">
          {isArabic
            ? `مرحبًا بعودتك، ${displayName} 👋`
            : `Welcome back, ${displayName} 👋`}
        </p>
      </div>

      {/* =========================
          Controls
          ========================= */}

      <div
        className="flex items-center gap-3 shrink-0"
        dir="ltr"
      >
        {/* Logout */}

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-white font-semibold whitespace-nowrap"
          aria-label={
            isArabic
              ? "تسجيل الخروج"
              : "Logout"
          }
        >
          {loggingOut
            ? isArabic
              ? "جارٍ الخروج..."
              : "Logging out..."
            : isArabic
            ? "تسجيل الخروج"
            : "Logout"}
        </button>

        {/* Account */}

        <Link
          href="/dashboard/settings"
          className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 transition flex items-center justify-center font-bold text-white shrink-0"
          title={displayName}
          aria-label={displayName}
        >
          {avatarInitial}
        </Link>

        {/* Theme */}

        <button
          type="button"
          onClick={toggleTheme}
          className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 transition text-white flex items-center justify-center"
          aria-label={
            isDark
              ? "Switch to light theme"
              : "Switch to dark theme"
          }
        >
          {isDark
            ? "☀️"
            : "🌙"}
        </button>

        {/* Language */}

        <button
          type="button"
          onClick={toggleLanguage}
          className="px-4 h-11 min-w-[88px] rounded-xl bg-slate-800 hover:bg-slate-700 transition text-white font-semibold flex items-center justify-center whitespace-nowrap"
          aria-label={
            isArabic
              ? "Switch to English"
              : "Switch to Arabic"
          }
        >
          {languageButtonLabel}
        </button>
      </div>
    </header>
  );
}