"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Language = "en" | "ar";

type UserRole =
  | "user"
  | "admin"
  | "super_admin";

const menu = [
  {
    key: "Dashboard",
    href: "/dashboard",
  },
  {
    key: "Transactions",
    href: "/dashboard/transactions",
  },
  {
    key: "Budgets",
    href: "/dashboard/budgets",
  },
  {
    key: "Savings",
    href: "/dashboard/savings",
  },
  {
    key: "AI Assistant",
    href: "/dashboard/assistant",
  },
  {
    key: "Reports",
    href: "/dashboard/reports",
  },
  {
    key: "Settings",
    href: "/dashboard/settings",
  },
];

const translations: Record<
  string,
  string
> = {
  Dashboard: "لوحة التحكم",
  Transactions: "المعاملات",
  Budgets: "الميزانيات",
  Savings: "المدخرات",
  "AI Assistant": "المساعد الذكي",
  Reports: "التقارير",
  Settings: "الإعدادات",
};

const roleLabels: Record<
  UserRole,
  {
    en: string;
    ar: string;
  }
> = {
  user: {
    en: "User",
    ar: "مستخدم",
  },

  admin: {
    en: "Admin",
    ar: "مدير",
  },

  super_admin: {
    en: "Super Admin",
    ar: "المدير الأعلى",
  },
};

function isUserRole(
  value: unknown
): value is UserRole {
  return (
    value === "user" ||
    value === "admin" ||
    value === "super_admin"
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  const [language, setLanguage] =
    useState<Language>("en");

  const [mounted, setMounted] =
    useState(false);

  const [userRole, setUserRole] =
    useState<UserRole | null>(null);

  useEffect(() => {
    let isMounted = true;

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
    // Language changes
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
        setLanguage(updatedLanguage);
      }
    };

    // =========================
    // Load user role
    // =========================

    const loadUserRole = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (
          authError ||
          !user
        ) {
          if (isMounted) {
            setUserRole(null);
          }

          return;
        }

        const {
          data: profile,
          error: profileError,
        } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
          console.error(
            "Sidebar profile role lookup failed:",
            profileError
          );

          if (isMounted) {
            setUserRole(null);
          }

          return;
        }

        if (
          isMounted &&
          isUserRole(profile?.role)
        ) {
          setUserRole(profile.role);
        } else if (isMounted) {
          setUserRole(null);
        }
      } catch (error) {
        console.error(
          "Sidebar role loading error:",
          error
        );

        if (isMounted) {
          setUserRole(null);
        }
      }
    };

    // =========================
    // Auth changes
    // =========================

    const handleAuthChange = () => {
      void loadUserRole();
    };

    window.addEventListener(
      "languageChanged",
      handleLanguageChange
    );

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        handleAuthChange
      );

    void loadUserRole();

    return () => {
      isMounted = false;

      window.removeEventListener(
        "languageChanged",
        handleLanguageChange
      );

      subscription.unsubscribe();
    };
  }, []);

  // =========================
  // Direction
  // =========================

  const isArabic =
    mounted && language === "ar";

  const displayedRole = userRole
    ? roleLabels[userRole][
        isArabic ? "ar" : "en"
      ]
    : isArabic
    ? "جاري التحميل..."
    : "Loading...";

  return (
    <aside
      dir={isArabic ? "rtl" : "ltr"}
      className={`w-72 shrink-0 bg-slate-900 p-6 flex flex-col ${
        isArabic
          ? "border-l border-slate-800"
          : "border-r border-slate-800"
      }`}
    >
      {/* =========================
          Brand
          ========================= */}

      <h1 className="text-3xl font-bold mb-12">
        El-Mayhoub
      </h1>

      {/* =========================
          Navigation
          ========================= */}

      <nav className="space-y-3 flex-1">
        {menu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-5 py-4 rounded-xl transition ${
              pathname === item.href
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {isArabic
              ? translations[item.key]
              : item.key}
          </Link>
        ))}
      </nav>

      {/* =========================
          Current Role
          ========================= */}

      <div className="border-t border-slate-800 pt-6">
        <div className="text-sm text-slate-400">
          {isArabic
            ? "تم تسجيل الدخول باسم"
            : "Logged in as"}
        </div>

        <div className="font-semibold mt-1">
          {displayedRole}
        </div>
      </div>
    </aside>
  );
}