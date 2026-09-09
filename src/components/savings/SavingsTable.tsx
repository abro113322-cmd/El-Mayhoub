"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Saving } from "@/services/saving.service";

type Language = "en" | "ar";

type Props = {
  savings: Saving[];
  loading: boolean;

  onEdit: (saving: Saving) => void;

  onDelete: (saving: Saving) => void;
};

export default function SavingsTable({
  savings,
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(
      isArabic ? "ar-EG" : "en-US"
    );
  };

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

  if (savings.length === 0) {
    return (
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="bg-slate-900 rounded-2xl p-8 text-center text-slate-400"
      >
        {isArabic
          ? "لا توجد أهداف ادخار حتى الآن"
          : "No Saving Goals Yet"}
      </div>
    );
  }

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-lg"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="p-4 text-left">
                {isArabic ? "الهدف" : "Goal"}
              </th>

              <th className="p-4 text-left">
                {isArabic ? "الهدف المالي" : "Target"}
              </th>

              <th className="p-4 text-left">
                {isArabic ? "الحالي" : "Current"}
              </th>

              <th className="p-4 text-left">
                {isArabic ? "التقدم" : "Progress"}
              </th>

              <th className="p-4 text-left">
                {isArabic ? "الموعد النهائي" : "Deadline"}
              </th>

              <th className="p-4 text-center">
                {isArabic ? "الإجراءات" : "Actions"}
              </th>
            </tr>
          </thead>

          <tbody>
            {savings.map((item) => {
              const progress =
                item.target_amount === 0
                  ? 0
                  : Math.min(
                      (item.current_amount /
                        item.target_amount) *
                        100,
                      100
                    );

              return (
                <tr
                  key={item.id}
                  className="border-t border-slate-800 hover:bg-slate-800/40 transition-all duration-200"
                >
                  <td className="p-4 font-semibold">
                    {item.name}
                  </td>

                  <td
                    dir="ltr"
                    className="p-4 text-cyan-400 font-bold"
                  >
                    {item.target_amount.toFixed(2)} EGP
                  </td>

                  <td
                    dir="ltr"
                    className="p-4 text-green-400 font-bold"
                  >
                    {item.current_amount.toFixed(2)} EGP
                  </td>

                  <td className="p-4 w-80">
                    <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>

                    <p className="text-xs text-slate-400 mt-2">
                      {progress.toFixed(0)}%
                    </p>
                  </td>

                  <td
                    dir="ltr"
                    className="p-4 text-slate-300"
                  >
                    {formatDate(item.deadline)}
                  </td>

                  <td className="p-4">
                    <div className="flex justify-center gap-3">
                      <button
                        type="button"
                        title={isArabic ? "تعديل" : "Edit"}
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
                        title={isArabic ? "حذف" : "Delete"}
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