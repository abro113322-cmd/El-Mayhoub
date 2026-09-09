"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTransactions } from "@/hooks/useTransactions";

import DashboardLayout from "@/components/layout/DashboardLayout";
import TransactionsTable from "@/components/transactions/TransactionsTable";
import TransactionsToolbar from "@/components/transactions/TransactionsToolbar";
import AddTransactionModal from "@/components/modals/AddTransactionModal";

import {
  deleteTransaction,
  Transaction,
} from "@/services/transaction.service";

type Language = "en" | "ar";

export default function TransactionsPage() {
  const [userId, setUserId] = useState("");

  const [openModal, setOpenModal] = useState(false);

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | undefined>(undefined);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("all");

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

  const {
    transactions,
    loading,
    reload,
  } = useTransactions(userId);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const matchesSearch =
        item.description
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        item.currency
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        item.amount.toString().includes(search);

      const matchesFilter =
        filter === "all" || item.type === filter;

      return matchesSearch && matchesFilter;
    });
  }, [transactions, search, filter]);

  function handleAdd() {
    setSelectedTransaction(undefined);
    setOpenModal(true);
  }

  function handleEdit(transaction: Transaction) {
    setSelectedTransaction(transaction);
    setOpenModal(true);
  }

  async function handleDelete(transaction: Transaction) {
    const description =
      transaction.description ||
      (isArabic ? "المعاملة" : "transaction");

    const ok = confirm(
      isArabic
        ? `هل أنت متأكد من حذف "${description}"؟`
        : `Delete "${description}"?`
    );

    if (!ok) return;

    try {
      if (!transaction.id) {
        throw new Error("Transaction ID is missing.");
      }
      await deleteTransaction(userId, transaction.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete transaction.");
      return;
    }

    reload();
  }

  return (
    <DashboardLayout>
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold">
              {isArabic ? "المعاملات" : "Transactions"}
            </h1>

            <p className="text-slate-400 mt-2">
              {isArabic
                ? "إدارة دخلك ومصروفاتك"
                : "Manage your income and expenses"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 transition px-6 py-3 rounded-xl font-semibold whitespace-nowrap"
          >
            {isArabic
              ? "+ إضافة معاملة"
              : "+ Add Transaction"}
          </button>
        </div>

        {/* Toolbar */}
        <TransactionsToolbar
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
        />

        {/* Table */}
        <TransactionsTable
          transactions={filteredTransactions}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Add / Edit Modal */}
      <AddTransactionModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setSelectedTransaction(undefined);
        }}
        onSuccess={reload}
        transaction={selectedTransaction}
      />
    </DashboardLayout>
  );
}
