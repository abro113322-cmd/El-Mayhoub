import { supabase } from "@/lib/supabase";
import { isValidCurrencyCode, normalizeCurrencyCode } from "@/lib/currency";
import { requireAuthenticatedUserId } from "./auth.service";
import { apiRequest } from "./api-client";

export interface Account {
  id?: string;

  created_by?: string;

  space_id: string;

  name: string;

  type: string;

  currency: string;

  opening_balance: number;

  description?: string;

  is_archived?: boolean;
}

export async function getAccounts(userId: string) {
  const authenticatedUserId = await requireAuthenticatedUserId();

  if (userId !== authenticatedUserId) {
    throw new Error("You are not authorized to view these accounts.");
  }

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function addAccount(account: Account) {
  await requireAuthenticatedUserId();

  const accountData = { ...account };
  delete accountData.created_by;
  const currency = normalizeCurrencyCode(accountData.currency);

  if (!isValidCurrencyCode(currency)) {
    throw new Error("Only EGP is currently supported.");
  }

  if (
    !Number.isFinite(accountData.opening_balance) ||
    accountData.opening_balance < 0
  ) {
    throw new Error("Opening balance must be a valid non-negative number.");
  }

  return apiRequest<Account>("/api/accounts", {
    method: "POST",
    body: JSON.stringify({
      space_id: accountData.space_id,
      name: accountData.name,
      type: accountData.type,
      currency,
      opening_balance: accountData.opening_balance,
    }),
  });
}

export async function updateAccount(
  userId: string,
  id: string,
  account: Partial<Account>
) {
  const authenticatedUserId = await requireAuthenticatedUserId();

  if (userId !== authenticatedUserId) {
    throw new Error("You are not authorized to update this account.");
  }

  const accountData = { ...account };
  delete accountData.created_by;
  const normalizedAccountData = {
    ...accountData,
    ...(accountData.currency
      ? { currency: normalizeCurrencyCode(accountData.currency) }
      : {}),
  };
  if (
    normalizedAccountData.currency !== undefined &&
    !isValidCurrencyCode(normalizedAccountData.currency)
  ) {
    throw new Error("Only EGP is currently supported.");
  }

  if (
    normalizedAccountData.opening_balance !== undefined &&
    (!Number.isFinite(normalizedAccountData.opening_balance) ||
      normalizedAccountData.opening_balance < 0)
  ) {
    throw new Error("Opening balance must be a valid non-negative number.");
  }

  const { space_id, name, type, currency, opening_balance } =
    normalizedAccountData;

  return apiRequest<Account>("/api/accounts", {
    method: "PATCH",
    body: JSON.stringify({
      id,
      ...(space_id !== undefined ? { space_id } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(currency !== undefined ? { currency } : {}),
      ...(opening_balance !== undefined ? { opening_balance } : {}),
    }),
  });
}

export async function deleteAccount(userId: string, id: string) {
  const authenticatedUserId = await requireAuthenticatedUserId();

  if (userId !== authenticatedUserId) {
    throw new Error("You are not authorized to delete this account.");
  }

  await apiRequest<void>("/api/accounts", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });

  return true;
}
