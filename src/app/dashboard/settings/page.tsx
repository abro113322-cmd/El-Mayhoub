"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Language = "en" | "ar";
type Theme = "dark" | "light";
type Role = "super_admin" | "admin" | "user";

interface Profile {
  username: string | null;
  full_name: string | null;
  role: Role;
  language: Language;
}

export default function SettingsPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<Theme>("dark");

  const [username, setUsername] = useState("User");
  const [role, setRole] = useState<Role>("user");

  const [loading, setLoading] = useState(true);

  const isArabic = language === "ar";
  const isSuperAdmin = role === "super_admin";

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);

      // Load theme
      const savedTheme = localStorage.getItem("theme");

      if (savedTheme === "light") {
        setTheme("light");
        document.documentElement.classList.add("light");
      } else {
        setTheme("dark");
        document.documentElement.classList.remove("light");
      }

      // Load saved language locally first
      const savedLanguage =
        localStorage.getItem("language");

      if (
        savedLanguage === "ar" ||
        savedLanguage === "en"
      ) {
        setLanguage(savedLanguage);
      }

      // Get logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Get profile
      const { data: profile, error } =
        await supabase
          .from("profiles")
          .select(
            "username, full_name, role, language"
          )
          .eq("id", user.id)
          .single();

      if (error) {
        console.error(
          "Profile loading error:",
          error
        );
        setLoading(false);
        return;
      }

      if (profile) {
        const typedProfile =
          profile as Profile;

        setUsername(
          typedProfile.username ||
            typedProfile.full_name ||
            "User"
        );

        setRole(typedProfile.role);

        if (
          typedProfile.language === "ar" ||
          typedProfile.language === "en"
        ) {
          setLanguage(
            typedProfile.language
          );

          localStorage.setItem(
            "language",
            typedProfile.language
          );
        }
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  const handleLanguageChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value =
      event.target.value as Language;

    setLanguage(value);

    // Save locally
    localStorage.setItem("language", value);

    // Save to Supabase
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({
          language: value,
        })
        .eq("id", user.id);

      if (error) {
        console.error(
          "Language update error:",
          error
        );
      }
    }

    // Notify other components
    window.dispatchEvent(
      new CustomEvent("languageChanged", {
        detail: value,
      })
    );
  };

  const handleThemeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value =
      event.target.value as Theme;

    setTheme(value);

    localStorage.setItem("theme", value);

    if (value === "light") {
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
        detail: value,
      })
    );
  };

  const roleLabel =
    role === "super_admin"
      ? isArabic
        ? "المسؤول الأعلى"
        : "Super Administrator"
      : role === "admin"
      ? isArabic
        ? "مسؤول"
        : "Administrator"
      : isArabic
      ? "مستخدم"
      : "User";

  return (
    <div dir={isArabic ? "rtl" : "ltr"}>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white">
          {isArabic
            ? "الإعدادات"
            : "Settings"}
        </h1>

        <p className="text-slate-400 mt-2">
          {isArabic
            ? "إدارة حسابك وتفضيلات التطبيق"
            : "Manage your account and application preferences"}
        </p>
      </div>

      <div className="space-y-6">

        {/* Account */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            {isArabic
              ? "الحساب"
              : "Account"}
          </h2>

          <div className="grid gap-5 md:grid-cols-2">

            {/* Username */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                {isArabic
                  ? "اسم المستخدم"
                  : "Username"}
              </label>

              <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white">
                {loading
                  ? isArabic
                    ? "جاري التحميل..."
                    : "Loading..."
                  : username}
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                {isArabic
                  ? "الصلاحية"
                  : "Role"}
              </label>

              <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white">
                {loading
                  ? isArabic
                    ? "جاري التحميل..."
                    : "Loading..."
                  : roleLabel}
              </div>
            </div>

          </div>
        </div>

        {/* Preferences */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            {isArabic
              ? "التفضيلات"
              : "Preferences"}
          </h2>

          <div className="grid gap-5 md:grid-cols-2">

            {/* Language */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                {isArabic
                  ? "اللغة"
                  : "Language"}
              </label>

              <select
                value={language}
                onChange={
                  handleLanguageChange
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="en">
                  English
                </option>

                <option value="ar">
                  العربية
                </option>
              </select>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                {isArabic
                  ? "المظهر"
                  : "Theme"}
              </label>

              <select
                value={theme}
                onChange={
                  handleThemeChange
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="dark">
                  {isArabic
                    ? "داكن"
                    : "Dark"}
                </option>

                <option value="light">
                  {isArabic
                    ? "فاتح"
                    : "Light"}
                </option>
              </select>
            </div>

          </div>
        </div>

        {/* Security */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            {isArabic
              ? "الأمان"
              : "Security"}
          </h2>

          <div className="flex items-center justify-between bg-slate-800 rounded-xl p-4">

            <div>
              <div className="text-white font-medium">
                {isArabic
                  ? "حالة الحساب"
                  : "Account Status"}
              </div>

              <div className="text-sm text-slate-400 mt-1">
                {isArabic
                  ? "حسابك نشط"
                  : "Your account is active"}
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-sm bg-green-500/10 text-green-400 border border-green-500/20">
              {isArabic
                ? "نشط"
                : "Active"}
            </span>

          </div>
        </div>

        {/* Super Admin Control Center */}
        {isSuperAdmin && (
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-950/80 via-slate-900 to-blue-950/80 border border-purple-500/30 rounded-2xl p-6">

            <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5" />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

              <div className="flex items-start gap-4">

                <div className="w-14 h-14 shrink-0 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-2xl">
                  🛡️
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {isArabic
                      ? "مركز تحكم المسؤول الأعلى"
                      : "Super Admin Control Center"}
                  </h2>

                  <p className="text-slate-400 mt-2 max-w-2xl">
                    {isArabic
                      ? "إدارة كاملة للمستخدمين والحسابات والصلاحيات والبيانات وإعدادات النظام."
                      : "Full system administration for users, accounts, permissions, financial data and system controls."}
                  </p>

                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    {isArabic
                      ? "Super Admin فقط"
                      : "Super Admin only"}
                  </div>
                </div>

              </div>

              <Link
                href="/dashboard/admin"
                className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition"
              >
                {isArabic
                  ? "فتح لوحة التحكم"
                  : "Open Control Center"}

                <span aria-hidden="true">
                  {isArabic
                    ? "←"
                    : "→"}
                </span>
              </Link>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}