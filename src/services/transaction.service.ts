import { supabase } from "@/lib/supabase";
import { isValidCurrencyCode, normalizeCurrencyCode } from "@/lib/currency";
import { requireAuthenticatedUserId } from "./auth.service";
import { requestFinancialMutation } from "@/lib/financial-api";

export interface Transaction {
  id?: string;

  user_id: string;

  space_id: string;

  account_id: string;

  category_id: string;

  type: "income" | "expense" | "transfer";

  amount: number;

  currency: string;

  occurred_at: string;

  description?: string;

  payment_method?: string;

  notes?: string;
}

export async function getTransactions(userId: string) {
  const authenticatedUserId = await requireAuthenticatedUserId();

  if (userId !== authenticatedUserId) {
    throw new Error("You are not authorized to view these transactions.");
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function addTransaction(
  transaction: Transaction,
  idempotencyKey?: string
) {
  await requireAuthenticatedUserId();

  if (transaction.type === "transfer") {
    throw new Error("Transfers must use the secure transfer operation.");
  }

  const currency = normalizeCurrencyCode(transaction.currency);
  if (!isValidCurrencyCode(currency)) {
    throw new Error("Only EGP is currently supported.");
  }

  if (
    !Number.isFinite(transaction.amount) ||
    transaction.amount <= 0
  ) {
    throw new Error("Amount must be a positive number.");
  }

  if (Number.isNaN(Date.parse(transaction.occurred_at))) {
    throw new Error("Transaction date is invalid.");
  }

  const response = await requestFinancialMutation<{ transaction: Transaction }>(
    "/api/transactions",
    "POST",
    {
      space_id: transaction.space_id,
      account_id: transaction.account_id,
      category_id: transaction.category_id,
      type: transaction.type,
      amount: transaction.amount,
      currency,
      occurred_at: transaction.occurred_at,
      description: transaction.description,
      payment_method: transaction.payment_method,
      notes: transaction.notes,
    },
    idempotencyKey
  );

  return response.transaction;
}

function validateTransactionAmount(amount: number | undefined) {
  if (
    amount !== undefined &&
    (!Number.isFinite(amount) || amount <= 0)
  ) {
    throw new Error("Amount must be a positive number.");
  }
}

export async function updateTransaction(
  userId: string,
  id: string,
  transaction: Partial<Transaction>,
  idempotencyKey?: string
) {
  const authenticatedUserId = await requireAuthenticatedUserId();

  if (userId !== authenticatedUserId) {
    throw new Error("You are not authorized to update this transaction.");
  }

  const transactionData = { ...transaction };
  delete transactionData.user_id;
  delete transactionData.space_id;
  delete transactionData.account_id;
  delete transactionData.category_id;

  if (transactionData.type === "transfer") {
    throw new Error("Transfers must use the secure transfer operation.");
  }

  validateTransactionAmount(transactionData.amount);

  const normalizedTransactionData = {
    ...transactionData,
    ...(transactionData.currency
      ? { currency: normalizeCurrencyCode(transactionData.currency) }
      : {}),
  };
  if (
    normalizedTransactionData.currency !== undefined &&
    !isValidCurrencyCode(normalizedTransactionData.currency)
  ) {
    throw new Error("Only EGP is currently supported.");
  }

  if (
    normalizedTransactionData.occurred_at !== undefined &&
    Number.isNaN(Date.parse(normalizedTransactionData.occurred_at))
  ) {
    throw new Error("Transaction date is invalid.");
  }

  const response = await requestFinancialMutation<{ transaction: Transaction }>(
    "/api/transactions",
    "PATCH",
    {
      id,
      type: normalizedTransactionData.type,
      amount: normalizedTransactionData.amount,
      currency: normalizedTransactionData.currency,
      occurred_at: normalizedTransactionData.occurred_at,
      description: normalizedTransactionData.description,
      payment_method: normalizedTransactionData.payment_method,
      notes: normalizedTransactionData.notes,
    },
    idempotencyKey
  );

  return response.transaction;
}

export async function deleteTransaction(
  userId: string,
  id: string,
  idempotencyKey?: string
) {
  const authenticatedUserId = await requireAuthenticatedUserId();

  if (userId !== authenticatedUserId) {
    throw new Error("You are not authorized to delete this transaction.");
  }

  await requestFinancialMutation(
    "/api/transactions",
    "DELETE",
    { id },
    idempotencyKey
  );

  return true;
}
