"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  addTransaction,
  updateTransaction,
  type Transaction,
} from "@/services/transaction.service";
import {
  isValidCurrencyCode,
  normalizeCurrencyCode,
} from "@/lib/currency";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: Transaction;
};

type SelectOption = { id: string; name: string; space_id: string };

export default function AddTransactionModal({
  open,
  onClose,
  onSuccess,
  transaction,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState<Transaction["type"]>("expense");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [accounts, setAccounts] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    async function loadOptions() {
      if (!open) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: accountData, error: accountError }, { data: categoryData, error: categoryError }] =
        await Promise.all([
          supabase.from("accounts").select("id, name, space_id").eq("created_by", user.id).order("name"),
          supabase.from("categories").select("id, name, space_id").order("name"),
        ]);
      if (accountError) throw accountError;
      if (categoryError) throw categoryError;
      setAccounts(accountData ?? []);
      setCategories(categoryData ?? []);
    }

    void loadOptions();

    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setCurrency(transaction.currency);
      setDate(transaction.occurred_at?.split("T")[0] || "");
      setDescription(transaction.description || "");
      setNotes(transaction.notes || "");
      setAccountId(transaction.account_id);
      setCategoryId(transaction.category_id);
    } else {
      setType("expense");
      setAmount("");
      setCurrency("EGP");
      setDate("");
      setDescription("");
      setNotes("");
      setAccountId("");
      setCategoryId("");
    }
  }, [open, transaction]);

  if (!open) return null;

  async function saveTransaction() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please login first.");
      }

      const normalizedCurrency = normalizeCurrencyCode(currency);

      if (!isValidCurrencyCode(normalizedCurrency)) {
        throw new Error("Only EGP is currently supported.");
      }

      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Amount must be a positive number.");
      }
      if (!date || !accountId || !categoryId) {
        throw new Error("Date, account, and category are required.");
      }

      const account = accounts.find((item) => item.id === accountId);
      if (!account) throw new Error("Select an accessible account.");

      if (transaction) {
        await updateTransaction(user.id, transaction.id!, {
            type,
            amount: parsedAmount,
            currency: normalizedCurrency,
            occurred_at: date,
            description,
            notes,
          });
      } else {
        await addTransaction({
            user_id: user.id,
            space_id: account.space_id,
            account_id: accountId,
            category_id: categoryId,
            type,
            amount: parsedAmount,
            currency: normalizedCurrency,
            occurred_at: date,
            description,
            notes,
          });
      }

      alert(
        transaction
          ? "Transaction updated successfully."
          : "Transaction added successfully."
      );

      onSuccess();
      onClose();

      setType("expense");
      setAmount("");
      setCurrency("EGP");
      setDate("");
      setDescription("");
      setNotes("");
    } catch (error: unknown) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save transaction."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 w-full max-w-2xl rounded-2xl p-8">

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">
            {transaction ? "Edit Transaction" : "Add Transaction"}
          </h2>

          <button
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block mb-2">Type</label>

            <select
              value={type}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "income" || value === "expense") {
                  setType(value);
                }
              }}
              className="w-full bg-slate-800 rounded-xl p-3"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div>
            <label className="block mb-2">Account</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full bg-slate-800 rounded-xl p-3">
              <option value="">Select account</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block mb-2">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-slate-800 rounded-xl p-3">
              <option value="">Select category</option>
              {categories
                .filter((category) => !accountId || category.space_id === accounts.find((account) => account.id === accountId)?.space_id)
                .map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block mb-2">Amount</label>

            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-800 rounded-xl p-3"
            />
          </div>

          <div>
            <label className="block mb-2">Currency</label>

            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-slate-800 rounded-xl p-3"
            />
          </div>

          <div>
            <label className="block mb-2">Date</label>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 rounded-xl p-3"
            />
          </div>

          <div className="col-span-2">
            <label className="block mb-2">Description</label>

            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 rounded-xl p-3"
            />
          </div>

          <div className="col-span-2">
            <label className="block mb-2">Notes</label>

            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 rounded-xl p-3"
            />
          </div>

        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition"
          >
            Cancel
          </button>

          <button
            onClick={saveTransaction}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading
              ? transaction
                ? "Updating..."
                : "Saving..."
              : transaction
              ? "Update"
              : "Save"}
          </button>

        </div>

      </div>
    </div>
  );
}
