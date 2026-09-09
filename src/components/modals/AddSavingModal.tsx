"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  createSaving,
  updateSaving,
  type Saving,
} from "@/services/saving.service";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  saving?: Saving;
};

export default function AddSavingModal({
  open,
  onClose,
  onSuccess,
  saving,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] =
    useState("");
  const [currentAmount, setCurrentAmount] =
    useState("");
  const [deadline, setDeadline] =
    useState("");

  useEffect(() => {
    if (saving) {
      setName(saving.name);
      setTargetAmount(
        saving.target_amount.toString()
      );
      setCurrentAmount(
        saving.current_amount.toString()
      );
      setDeadline(saving.deadline);
    } else {
      setName("");
      setTargetAmount("");
      setCurrentAmount("");
      setDeadline("");
    }
  }, [saving]);

  if (!open) return null;

  async function saveSaving() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Please login first."
        );
      }

      const { data: accounts, error: accountError } = await supabase
        .from("accounts")
        .select("space_id")
        .eq("created_by", user.id)
        .limit(2);

      if (accountError)
        throw accountError;
      if (!accounts || accounts.length !== 1) {
        throw new Error("Select a single accessible account first.");
      }
      const account = accounts[0];
      if (saving) {
        await updateSaving(user.id, saving.id, {
          name,
          target_amount: Number(targetAmount),
          deadline,
        });
      } else {
        await createSaving({
            user_id: user.id,
            space_id: account.space_id,
            name,
            target_amount: Number(targetAmount),
            current_amount: Number(currentAmount),
            deadline,
          });
      }

      alert(
        saving
          ? "Saving goal updated successfully."
          : "Saving goal added successfully."
      );

      onSuccess();
      onClose();

      setName("");
      setTargetAmount("");
      setCurrentAmount("");
      setDeadline("");
    } catch (error: unknown) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save saving goal."
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
            {saving
              ? "Edit Saving Goal"
              : "Add Saving Goal"}
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
              Goal Name
            </label>

            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              className="w-full bg-slate-800 rounded-xl p-3"
              placeholder="Buy New Laptop"
            />

          </div>

          <div>

            <label className="block mb-2">
              Target Amount
            </label>

            <input
              type="number"
              value={targetAmount}
              onChange={(e) =>
                setTargetAmount(e.target.value)
              }
              className="w-full bg-slate-800 rounded-xl p-3"
            />

          </div>

          <div>

            <label className="block mb-2">
              Current Amount
            </label>

            <input
              type="number"
              value={currentAmount}
              onChange={(e) =>
                setCurrentAmount(e.target.value)
              }
              className="w-full bg-slate-800 rounded-xl p-3"
            />

          </div>

          <div>

            <label className="block mb-2">
              Deadline
            </label>

            <input
              type="date"
              value={deadline}
              onChange={(e) =>
                setDeadline(e.target.value)
              }
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
            onClick={saveSaving}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading
              ? saving
                ? "Updating..."
                : "Saving..."
              : saving
              ? "Update"
              : "Save"}
          </button>

        </div>

      </div>
    </div>
  );
}
