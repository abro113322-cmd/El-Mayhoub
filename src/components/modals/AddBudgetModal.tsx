"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  addBudget,
  updateBudget,
  type Budget,
} from "@/services/budget.service";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  budget?: Budget;
};

export default function AddBudgetModal({
  open,
  onClose,
  onSuccess,
  budget,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (budget) {
      setName(budget.name);
      setAmount(budget.amount.toString());
      setStartDate(budget.start_date);
      setEndDate(budget.end_date);
    } else {
      setName("");
      setAmount("");
      setStartDate("");
      setEndDate("");
    }
  }, [budget]);

  if (!open) return null;

  async function saveBudget() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please login first.");
      }

      const { data: accounts, error: accountError } = await supabase
        .from("accounts")
        .select("space_id")
        .eq("created_by", user.id)
        .limit(2);

      if (accountError) throw accountError;
      if (!accounts || accounts.length !== 1) {
        throw new Error("Select a single accessible account first.");
      }
      const account = accounts[0];

      const { data: categories, error: categoryError } = await supabase
        .from("categories")
        .select("id")
        .eq("space_id", account.space_id)
        .limit(2);

      if (categoryError) throw categoryError;
      if (!categories || categories.length !== 1) {
        throw new Error("Select a single accessible category first.");
      }
      const category = categories[0];

      if (budget) {
        await updateBudget(user.id, budget.id!, {
          name,
          amount: Number(amount),
          start_date: startDate,
          end_date: endDate,
        });
      } else {
        await addBudget({
          user_id: user.id,
          space_id: account.space_id,
          category_id: category.id,
          name,
          amount: Number(amount),
          spent: 0,
          start_date: startDate,
          end_date: endDate,
        });
      }

      alert(
        budget
          ? "Budget updated successfully."
          : "Budget added successfully."
      );

      onSuccess();
      onClose();

      setName("");
      setAmount("");
      setStartDate("");
      setEndDate("");
    } catch (error: unknown) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save budget."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 w-full max-w-xl rounded-2xl p-8">

        <div className="flex justify-between items-center mb-8">

          <h2 className="text-3xl font-bold">
            {budget ? "Edit Budget" : "Add Budget"}
          </h2>

          <button
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-white"
          >
            ✕
          </button>

        </div>

        <div className="space-y-5">

          <div>

            <label className="block mb-2">
              Budget Name
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 rounded-xl p-3"
              placeholder="Food Budget"
            />

          </div>

          <div>

            <label className="block mb-2">
              Budget Amount
            </label>

            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-800 rounded-xl p-3"
            />

          </div>

          <div className="grid grid-cols-2 gap-5">

            <div>

              <label className="block mb-2">
                Start Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
                className="w-full bg-slate-800 rounded-xl p-3"
              />

            </div>

            <div>

              <label className="block mb-2">
                End Date
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.target.value)
                }
                className="w-full bg-slate-800 rounded-xl p-3"
              />

            </div>

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
            onClick={saveBudget}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading
              ? budget
                ? "Updating..."
                : "Saving..."
              : budget
              ? "Update"
              : "Save"}
          </button>

        </div>

      </div>
    </div>
  );
}
