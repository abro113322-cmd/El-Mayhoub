"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";

type Language = "en" | "ar";

export default function AssistantPage() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  const [userId, setUserId] = useState("");
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

  async function sendMessage() {
    if (!message.trim()) return;

    if (!userId) {
      setReply(
        isArabic
          ? "يرجى الانتظار، جاري تحميل المستخدم..."
          : "Please wait, loading user..."
      );
      return;
    }

    setLoading(true);
    setReply("");

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          userId,
        }),
      });

      const data = await response.json();

      if (data.reply) {
        setReply(data.reply);
      } else {
        setReply(
          isArabic
            ? "لا توجد استجابة."
            : "No response."
        );
      }
    } catch (error) {
      console.error(error);

      setReply(
        isArabic
          ? "حدث خطأ ما."
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="space-y-8"
      >
        <div>
          <h1 className="text-4xl font-bold">
            {isArabic
              ? "المساعد الذكي"
              : "AI Assistant"}
          </h1>

          <p className="text-slate-400 mt-2">
            {isArabic
              ? "اسأل أي شيء عن أموالك أو أي سؤال عام."
              : "Ask anything about your finances or any general question."}
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6">
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isArabic
                ? `مثال:

ضيف مصروف 250 جنيه أكل

أو

مين اخترع الكمبيوتر؟`
                : `Example:

Add an expense of 250 EGP for food

Or

Who invented the computer?`
            }
            className="w-full bg-slate-800 rounded-xl p-4 outline-none resize-none"
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={loading || !userId}
            className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-3 rounded-xl"
          >
            {loading
              ? isArabic
                ? "جاري التفكير..."
                : "Thinking..."
              : isArabic
              ? "إرسال"
              : "Send"}
          </button>

          {reply && (
            <div className="mt-8 bg-slate-800 rounded-xl p-5 border border-slate-700">
              <h3 className="font-semibold mb-3 text-blue-400">
                {isArabic
                  ? "استجابة الذكاء الاصطناعي"
                  : "AI Response"}
              </h3>

              <div className="whitespace-pre-wrap text-slate-200">
                {reply}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}