"use client";

import { useEffect, useState } from "react";
import { Budget } from "@/services/budget.service";
import { Pencil, Trash2 } from "lucide-react";

type Language = "en" | "ar";

type Props = {
  budgets: Budget[];
  loading: boolean;

  onEdit: (budget: Budget) => void;

  onDelete: (budget: Budget) => void;
};

export default function BudgetsTable({
  budgets,
  loading,
  onEdit,
  onDelete,
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

  if (loading) {
    return (
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="bg-slate-900 rounded-2xl p-8 text-center"
      >
        {isArabic ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="bg-slate-900 rounded-2xl p-8 text-center text-slate-400"
      >
        {isArabic
          ? "لا توجد ميزانيات حتى الآن"
          : "No Budgets Yet"}
      </div>
    );
  }

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="p-4 text-left">
                {isArabic ? "الاسم" : "Name"}
              </th>

              <th className="p-4 text-left">
                {isArabic ? "الميزانية" : "Budget"}
              </th>

              <th className="p-4 text-left">
                {isArabic ? "المنفق" : "Spent"}
              </th>

              <th className="p-4 text-left">
                {isArabic ? "التقدم" : "Progress"}
              </th>

              <th className="p-4 text-center">
                {isArabic ? "الإجراءات" : "Actions"}
              </th>
            </tr>
          </thead>

          <tbody>
            {budgets.map((item) => {
              const spent = item.spent || 0;

              const progress =
                item.amount > 0
                  ? Math.min(
                      (spent / item.amount) * 100,
                      100
                    )
                  : 0;

              return (
                <tr
                  key={item.id}
                  className="border-t border-slate-800 hover:bg-slate-800/40 transition"
                >
                  <td className="p-4">
                    {item.name}
                  </td>

                  <td
                    dir="ltr"
                    className="p-4 font-bold"
                  >
                    {item.amount.toFixed(2)} EGP
                  </td>

                  <td
                    dir="ltr"
                    className="p-4 text-red-400"
                  >
                    {spent.toFixed(2)} EGP
                  </td>

                  <td className="p-4 w-72">
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          progress >= 100
                            ? "bg-red-500"
                            : progress >= 80
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>

                    <p className="text-xs text-slate-400 mt-2">
                      {progress.toFixed(0)}%
                    </p>
                  </td>

                  <td className="p-4">
                    <div className="flex justify-center gap-3">
                      <button
                        type="button"
                        title={
                          isArabic ? "تعديل" : "Edit"
                        }
                        aria-label={
                          isArabic ? "تعديل" : "Edit"
                        }
                        onClick={() => onEdit(item)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        type="button"
                        title={
                          isArabic ? "حذف" : "Delete"
                        }
                        aria-label={
                          isArabic ? "حذف" : "Delete"
                        }
                        onClick={() => onDelete(item)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}