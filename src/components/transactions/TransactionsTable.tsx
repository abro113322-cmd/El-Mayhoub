"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Transaction } from "@/services/transaction.service";

type Language = "en" | "ar";

type Props = {
  transactions: Transaction[];
  loading: boolean;

  onEdit: (transaction: Transaction) => void;

  onDelete: (transaction: Transaction) => void;
};

export default function TransactionsTable({
  transactions,
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

  const getTransactionTypeLabel = (
    type: Transaction["type"]
  ) => {
    if (!isArabic) {
      return (
        type.charAt(0).toUpperCase() +
        type.slice(1)
      );
    }

    switch (type) {
      case "income":
        return "الدخل";

      case "expense":
        return "مصروف";

      case "transfer":
        return "تحويل";

      default:
        return type;
    }
  };

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

  if (transactions.length === 0) {
    return (
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="bg-slate-900 rounded-2xl p-8 text-center text-slate-400"
      >
        {isArabic
          ? "لا توجد معاملات حتى الآن"
          : "No Transactions Yet"}
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
                {isArabic ? "النوع" : "Type"}
              </th>

              <th className="p-4 text-left">
                {isArabic ? "المبلغ" : "Amount"}
              </th>

              <th className="p-4 text-left">
                {isArabic ? "العملة" : "Currency"}
              </th>

              <th className="p-4 text-left">
                {isArabic ? "الوصف" : "Description"}
              </th>

              <th className="p-4 text-left">
                {isArabic ? "التاريخ" : "Date"}
              </th>

              <th className="p-4 text-center">
                {isArabic ? "الإجراءات" : "Actions"}
              </th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((item) => {
              const badgeClass =
                item.type === "income"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : item.type === "expense"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30";

              const amountClass =
                item.type === "income"
                  ? "text-green-400"
                  : item.type === "expense"
                  ? "text-red-400"
                  : "text-blue-400";

              return (
                <tr
                  key={item.id}
                  className="border-t border-slate-800 hover:bg-slate-800/40 transition-all duration-200"
                >
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${badgeClass}`}
                    >
                      {getTransactionTypeLabel(item.type)}
                    </span>
                  </td>

                  <td
                    dir="ltr"
                    className={`p-4 font-bold ${amountClass}`}
                  >
                    {Number(item.amount).toLocaleString(
                      isArabic ? "ar-EG" : undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </td>

                  <td
                    dir="ltr"
                    className="p-4 font-medium text-slate-300"
                  >
                    {item.currency}
                  </td>

                  <td className="p-4 text-slate-300">
                    {item.description || "-"}
                  </td>

                  <td
                    dir="ltr"
                    className="p-4 text-slate-300"
                  >
                    {formatDate(item.occurred_at)}
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