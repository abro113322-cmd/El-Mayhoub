"use client";

import { useEffect, useState } from "react";
import { Transaction } from "@/services/transaction.service";

type Language = "en" | "ar";

type Props = {
  transactions: Transaction[];
};

export default function RecentTransactions({
  transactions,
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
      return type;
    }

    switch (type) {
      case "income":
        return "دخل";

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

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="bg-slate-900 rounded-2xl p-6 h-96 overflow-y-auto"
    >
      <h2 className="text-2xl font-bold mb-6">
        {isArabic
          ? "المعاملات الأخيرة"
          : "Recent Transactions"}
      </h2>

      {transactions.length === 0 ? (
        <div className="text-slate-400 text-center mt-20">
          {isArabic
            ? "لا توجد معاملات"
            : "No Transactions"}
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((item, index) => {
            const color =
              item.type === "income"
                ? "text-green-400"
                : item.type === "expense"
                ? "text-red-400"
                : "text-blue-400";

            return (
              <div
                key={
                  item.id ??
                  `${item.occurred_at}-${item.description}-${index}`
                }
                className="flex items-center justify-between border-b border-slate-800 pb-3"
              >
                <div>
                  <p className="font-semibold">
                    {item.description ||
                      getTransactionTypeLabel(item.type)}
                  </p>

                  <p className="text-sm text-slate-400">
                    {formatDate(item.occurred_at)}
                  </p>
                </div>

                <div
                  dir="ltr"
                  className={`font-bold ${color}`}
                >
                  {Number(item.amount).toFixed(2)}{" "}
                  {item.currency}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}