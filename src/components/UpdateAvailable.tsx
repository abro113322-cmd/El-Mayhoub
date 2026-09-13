"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Language = "en" | "ar";

interface UpdateAvailableProps {
  loadedVersion: string;
}

const VERSION_CHECK_INTERVAL_MS = 60_000;

export default function UpdateAvailable({
  loadedVersion,
}: UpdateAvailableProps) {
  const [language, setLanguage] = useState<Language>("en");
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const checkInFlight = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (checkInFlight.current) {
      return;
    }

    checkInFlight.current = true;

    try {
      const response = await fetch("/api/version", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const data: unknown = await response.json();

      if (
        typeof data !== "object" ||
        data === null ||
        typeof (data as { version?: unknown }).version !== "string"
      ) {
        return;
      }

      setUpdateAvailable(
        (data as { version: string }).version !== loadedVersion
      );
    } catch {
      // A version check must never affect the application.
    } finally {
      checkInFlight.current = false;
    }
  }, [loadedVersion]);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language");

    if (savedLanguage === "ar" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }

    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<Language>;

      if (customEvent.detail === "ar" || customEvent.detail === "en") {
        setLanguage(customEvent.detail);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdate();
      }
    };

    window.addEventListener("languageChanged", handleLanguageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void checkForUpdate();

    const interval = window.setInterval(() => {
      void checkForUpdate();
    }, VERSION_CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      window.clearInterval(interval);
    };
  }, [checkForUpdate]);

  const handleUpdate = () => {
    if (updating) {
      return;
    }

    setUpdating(true);
    window.location.reload();
  };

  if (!updateAvailable) {
    return null;
  }

  const isArabic = language === "ar";

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-blue-400/40 bg-slate-900 px-4 py-2 text-sm text-white shadow-lg"
      role="status"
    >
      <span>{isArabic ? "يتوفر تحديث" : "Update available"}</span>
      <button
        type="button"
        onClick={handleUpdate}
        disabled={updating}
        className="rounded-full bg-blue-600 px-3 py-1 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
      >
        {updating
          ? isArabic
            ? "جارٍ التحديث..."
            : "Updating..."
          : isArabic
            ? "تحديث"
            : "Update"}
      </button>
    </div>
  );
}
