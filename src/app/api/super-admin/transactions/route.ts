import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidCurrencyCode } from "@/lib/currency";

type TransactionType = "income" | "expense" | "transfer";

type TransactionWriteBody = {
  user_id?: string | null;
  space_id?: string;
  account_id?: string;
  category_id?: string | null;
  type?: TransactionType;
  amount?: number;
  currency?: string;
  occurred_at?: string;
  description?: string | null;
  payment_method?: string | null;
  notes?: string | null;
};

async function requireSuperAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    console.error(
      "Super Admin transactions profile check error:",
      profileError
    );

    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Profile check failed" },
        { status: 500 }
      ),
    };
  }

  if (!profile) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      ),
    };
  }

  if (profile.role !== "super_admin") {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    errorResponse: null,
  };
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isValidTransactionType(
  value: unknown
): value is TransactionType {
  return (
    value === "income" ||
    value === "expense" ||
    value === "transfer"
  );
}

function isValidDate(value: string) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function cleanNullableString(
  value: unknown
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

async function validateTransactionRelations(
  body: TransactionWriteBody,
  existing?: {
    user_id: string | null;
    space_id: string;
    account_id: string;
    category_id: string | null;
    type: TransactionType;
    amount: number;
    currency: string;
    occurred_at: string;
    description: string | null;
    payment_method: string | null;
    notes: string | null;
  }
) {
  const userId =
    body.user_id !== undefined
      ? body.user_id
      : existing?.user_id;

  const spaceId =
    body.space_id ?? existing?.space_id;

  const accountId =
    body.account_id ?? existing?.account_id;

  const categoryId =
    body.category_id !== undefined
      ? body.category_id
      : existing?.category_id;

  if (userId !== null && userId !== undefined) {
    if (!isValidUuid(userId)) {
      return {
        errorResponse: NextResponse.json(
          { error: "Invalid user_id." },
          { status: 400 }
        ),
      };
    }

    const {
      data: userProfile,
      error: userError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error(
        "Super Admin transaction user lookup error:",
        userError
      );

      return {
        errorResponse: NextResponse.json(
          { error: "Failed to verify transaction user." },
          { status: 500 }
        ),
      };
    }

    if (!userProfile) {
      return {
        errorResponse: NextResponse.json(
          { error: "Transaction user not found." },
          { status: 404 }
        ),
      };
    }
  }

  if (!spaceId || !isValidUuid(spaceId)) {
    return {
      errorResponse: NextResponse.json(
        { error: "Invalid space_id." },
        { status: 400 }
      ),
    };
  }

  if (!accountId || !isValidUuid(accountId)) {
    return {
      errorResponse: NextResponse.json(
        { error: "Invalid account_id." },
        { status: 400 }
      ),
    };
  }

  const {
    data: space,
    error: spaceError,
  } = await supabaseAdmin
    .from("spaces")
    .select("id")
    .eq("id", spaceId)
    .maybeSingle();

  if (spaceError) {
    console.error(
      "Super Admin transaction space lookup error:",
      spaceError
    );

    return {
      errorResponse: NextResponse.json(
        { error: "Failed to verify transaction space." },
        { status: 500 }
      ),
    };
  }

  if (!space) {
    return {
      errorResponse: NextResponse.json(
        { error: "Transaction space not found." },
        { status: 404 }
      ),
    };
  }

  const {
    data: account,
    error: accountError,
  } = await supabaseAdmin
    .from("accounts")
    .select("id, space_id, currency")
    .eq("id", accountId)
    .maybeSingle();

  if (accountError) {
    console.error(
      "Super Admin transaction account lookup error:",
      accountError
    );

    return {
      errorResponse: NextResponse.json(
        { error: "Failed to verify transaction account." },
        { status: 500 }
      ),
    };
  }

  if (!account) {
    return {
      errorResponse: NextResponse.json(
        { error: "Transaction account not found." },
        { status: 404 }
      ),
    };
  }

  if (account.space_id !== spaceId) {
    return {
      errorResponse: NextResponse.json(
        { error: "Account does not belong to the selected space." },
        { status: 400 }
      ),
    };
  }

  if (categoryId !== null && categoryId !== undefined) {
    if (!isValidUuid(categoryId)) {
      return {
        errorResponse: NextResponse.json(
          { error: "Invalid category_id." },
          { status: 400 }
        ),
      };
    }

    const {
      data: category,
      error: categoryError,
    } = await supabaseAdmin
      .from("categories")
      .select("id, space_id")
      .eq("id", categoryId)
      .maybeSingle();

    if (categoryError) {
      console.error(
        "Super Admin transaction category lookup error:",
        categoryError
      );

      return {
        errorResponse: NextResponse.json(
          { error: "Failed to verify transaction category." },
          { status: 500 }
        ),
      };
    }

    if (!category) {
      return {
        errorResponse: NextResponse.json(
          { error: "Transaction category not found." },
          { status: 404 }
        ),
      };
    }

    if (category.space_id !== spaceId) {
      return {
        errorResponse: NextResponse.json(
          { error: "Category does not belong to the selected space." },
          { status: 400 }
        ),
      };
    }
  }

  return {
    errorResponse: null,
    userId: userId ?? null,
    spaceId,
    accountId,
    categoryId: categoryId ?? null,
    accountCurrency: account.currency,
  };
}

function buildAuditSnapshot(transaction: Record<string, unknown>) {
  return {
    id: transaction.id ?? null,
    user_id: transaction.user_id ?? null,
    space_id: transaction.space_id ?? null,
    account_id: transaction.account_id ?? null,
    category_id: transaction.category_id ?? null,
    type: transaction.type ?? null,
    amount: transaction.amount ?? null,
    currency: transaction.currency ?? null,
    occurred_at: transaction.occurred_at ?? null,
    description: transaction.description ?? null,
    payment_method: transaction.payment_method ?? null,
    notes: transaction.notes ?? null,
  };
}

export async function GET(request: Request) {
  try {
    const {
      user: actor,
      errorResponse,
    } = await requireSuperAdmin();

    if (errorResponse || !actor) {
      return (
        errorResponse ??
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    const url = new URL(request.url);

    const search =
      url.searchParams.get("search")?.trim() ?? "";

    const type =
      url.searchParams.get("type") ?? "all";

    const userId =
      url.searchParams.get("user_id") ?? "";

    const accountId =
      url.searchParams.get("account_id") ?? "";

    const spaceId =
      url.searchParams.get("space_id") ?? "";

    const dateFrom =
      url.searchParams.get("date_from") ?? "";

    const dateTo =
      url.searchParams.get("date_to") ?? "";

    const minAmountValue =
      url.searchParams.get("min_amount") ?? "";

    const maxAmountValue =
      url.searchParams.get("max_amount") ?? "";

    let minAmount: number | null = null;
    let maxAmount: number | null = null;

    if (minAmountValue) {
      const parsed = Number(minAmountValue);

      if (!Number.isFinite(parsed)) {
        return NextResponse.json(
          { error: "Invalid minimum amount." },
          { status: 400 }
        );
      }

      minAmount = parsed;
    }

    if (maxAmountValue) {
      const parsed = Number(maxAmountValue);

      if (!Number.isFinite(parsed)) {
        return NextResponse.json(
          { error: "Invalid maximum amount." },
          { status: 400 }
        );
      }

      maxAmount = parsed;
    }

    if (
      type !== "all" &&
      type !== "income" &&
      type !== "expense" &&
      type !== "transfer"
    ) {
      return NextResponse.json(
        { error: "Invalid transaction type." },
        { status: 400 }
      );
    }

    if (
      dateFrom &&
      !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)
    ) {
      return NextResponse.json(
        { error: "Invalid date_from." },
        { status: 400 }
      );
    }

    if (
      dateTo &&
      !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)
    ) {
      return NextResponse.json(
        { error: "Invalid date_to." },
        { status: 400 }
      );
    }

    if (
      dateFrom &&
      dateTo &&
      dateFrom > dateTo
    ) {
      return NextResponse.json(
        {
          error:
            "date_from cannot be later than date_to.",
        },
        { status: 400 }
      );
    }

    if (
      minAmount !== null &&
      maxAmount !== null &&
      minAmount > maxAmount
    ) {
      return NextResponse.json(
        {
          error:
            "Minimum amount cannot exceed maximum amount.",
        },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from("transactions")
      .select(
        `
          id,
          user_id,
          space_id,
          account_id,
          category_id,
          type,
          amount,
          currency,
          occurred_at,
          description,
          payment_method,
          notes,
          created_at,
          updated_at
        `
      )
      .order("occurred_at", {
        ascending: false,
      })
      .limit(500);

    if (type !== "all") {
      query = query.eq("type", type);
    }

    if (userId) {
      if (!isValidUuid(userId)) {
        return NextResponse.json(
          { error: "Invalid user_id." },
          { status: 400 }
        );
      }

      query = query.eq(
        "user_id",
        userId
      );
    }

    if (accountId) {
      if (!isValidUuid(accountId)) {
        return NextResponse.json(
          { error: "Invalid account_id." },
          { status: 400 }
        );
      }

      query = query.eq(
        "account_id",
        accountId
      );
    }

    if (spaceId) {
      if (!isValidUuid(spaceId)) {
        return NextResponse.json(
          { error: "Invalid space_id." },
          { status: 400 }
        );
      }

      query = query.eq(
        "space_id",
        spaceId
      );
    }

    if (dateFrom) {
      query = query.gte(
        "occurred_at",
        `${dateFrom}T00:00:00.000Z`
      );
    }

    if (dateTo) {
      const endDate = new Date(
        `${dateTo}T00:00:00.000Z`
      );

      endDate.setUTCDate(
        endDate.getUTCDate() + 1
      );

      query = query.lt(
        "occurred_at",
        endDate.toISOString()
      );
    }

    if (minAmount !== null) {
      query = query.gte(
        "amount",
        minAmount
      );
    }

    if (maxAmount !== null) {
      query = query.lte(
        "amount",
        maxAmount
      );
    }

    const {
      data: transactions,
      error: transactionError,
    } = await query;

    if (transactionError) {
      console.error(
        "Super Admin transactions query error:",
        transactionError
      );

      return NextResponse.json(
        {
          error:
            "Failed to load transactions.",
        },
        { status: 500 }
      );
    }

    const rows = transactions ?? [];

    const userIds = Array.from(
      new Set(
        rows
          .map(
            (item) => item.user_id
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          )
      )
    );

    const accountIds = Array.from(
      new Set(
        rows.map(
          (item) => item.account_id
        )
      )
    );

    const spaceIds = Array.from(
      new Set(
        rows.map(
          (item) => item.space_id
        )
      )
    );

    const categoryIds = Array.from(
      new Set(
        rows
          .map(
            (item) => item.category_id
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          )
      )
    );

    const [
      profilesResult,
      accountsResult,
      spacesResult,
      categoriesResult,
      usersResult,
      allAccountsResult,
      allSpacesResult,
      allCategoriesResult,
    ] = await Promise.all([
      userIds.length > 0
        ? supabaseAdmin
            .from("profiles")
            .select(
              "id, full_name, username, email, role"
            )
            .in("id", userIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      accountIds.length > 0
        ? supabaseAdmin
            .from("accounts")
            .select(
              "id, name, currency, space_id"
            )
            .in("id", accountIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      spaceIds.length > 0
        ? supabaseAdmin
            .from("spaces")
            .select(
              "id, name, type, base_currency"
            )
            .in("id", spaceIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      categoryIds.length > 0
        ? supabaseAdmin
            .from("categories")
            .select(
              "id, name, space_id"
            )
            .in("id", categoryIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, username, email, role"
        )
        .order("created_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from("accounts")
        .select(
          "id, name, currency, space_id, is_archived"
        )
        .order("created_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from("spaces")
        .select(
          "id, name, type, base_currency"
        )
        .order("created_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from("categories")
        .select(
          "id, name, space_id"
        )
        .order("name", {
          ascending: true,
        }),
    ]);

    if (
      profilesResult.error ||
      accountsResult.error ||
      spacesResult.error ||
      categoriesResult.error ||
      usersResult.error ||
      allAccountsResult.error ||
      allSpacesResult.error ||
      allCategoriesResult.error
    ) {
      console.error(
        "Super Admin transactions relation lookup error:",
        profilesResult.error ??
          accountsResult.error ??
          spacesResult.error ??
          categoriesResult.error ??
          usersResult.error ??
          allAccountsResult.error ??
          allSpacesResult.error ??
          allCategoriesResult.error
      );

      return NextResponse.json(
        {
          error:
            "Failed to load transaction details.",
        },
        { status: 500 }
      );
    }

    const profilesById = new Map(
      (
        profilesResult.data ?? []
      ).map((profile) => [
        profile.id,
        profile,
      ])
    );

    const accountsById = new Map(
      (
        accountsResult.data ?? []
      ).map((account) => [
        account.id,
        account,
      ])
    );

    const spacesById = new Map(
      (
        spacesResult.data ?? []
      ).map((space) => [
        space.id,
        space,
      ])
    );

    const categoriesById = new Map(
      (
        categoriesResult.data ?? []
      ).map((category) => [
        category.id,
        category,
      ])
    );

    const normalizedSearch =
      search.toLowerCase();

    const filteredRows =
      normalizedSearch
        ? rows.filter(
            (transaction) => {
              const profile = transaction.user_id
                ? profilesById.get(
                    transaction.user_id
                  )
                : null;

              const account =
                accountsById.get(
                  transaction.account_id
                );

              const space =
                spacesById.get(
                  transaction.space_id
                );

              const category = transaction.category_id
                ? categoriesById.get(
                    transaction.category_id
                  )
                : null;

              const searchableText = [
                transaction.description,
                transaction.notes,
                transaction.payment_method,
                transaction.currency,
                transaction.amount,
                transaction.type,
                profile?.full_name,
                profile?.username,
                profile?.email,
                account?.name,
                space?.name,
                category?.name,
              ]
                .filter(
                  (value) =>
                    value !== null &&
                    value !== undefined
                )
                .join(" ")
                .toLowerCase();

              return searchableText.includes(
                normalizedSearch
              );
            }
          )
        : rows;

    return NextResponse.json({
      success: true,
      transactions:
        filteredRows.map(
          (transaction) => ({
            ...transaction,

            user: transaction.user_id
              ? profilesById.get(
                  transaction.user_id
                ) ?? null
              : null,

            account:
              accountsById.get(
                transaction.account_id
              ) ?? null,

            space:
              spacesById.get(
                transaction.space_id
              ) ?? null,

            category: transaction.category_id
              ? categoriesById.get(
                  transaction.category_id
                ) ?? null
              : null,
          })
        ),
      total: filteredRows.length,
      limited: rows.length >= 500,

      options: {
        users:
          usersResult.data ?? [],
        accounts:
          allAccountsResult.data ?? [],
        spaces:
          allSpacesResult.data ?? [],
        categories:
          allCategoriesResult.data ?? [],
      },
    });
  } catch (error) {
    console.error(
      "Super Admin transactions GET API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const {
      user: actor,
      errorResponse,
    } = await requireSuperAdmin();

    if (errorResponse || !actor) {
      return (
        errorResponse ??
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    let body: TransactionWriteBody;

    try {
      body =
        (await request.json()) as TransactionWriteBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (!isValidTransactionType(body.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid transaction type.",
        },
        { status: 400 }
      );
    }

    if (
      typeof body.amount !== "number" ||
      !Number.isFinite(body.amount) ||
      body.amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Amount must be a positive number.",
        },
        { status: 400 }
      );
    }

    const normalizedCurrency =
      typeof body.currency === "string"
        ? body.currency.trim().toUpperCase()
        : "";

    if (!isValidCurrencyCode(normalizedCurrency)) {
      return NextResponse.json(
        {
          error: "Currency must be a three-letter code.",
        },
        { status: 400 }
      );
    }

    if (
      body.occurred_at !== undefined &&
      !isValidDate(body.occurred_at)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid occurred_at date.",
        },
        { status: 400 }
      );
    }

    if (
      body.user_id === undefined ||
      body.user_id === null
    ) {
      return NextResponse.json(
        {
          error:
            "User is required for a new transaction.",
        },
        { status: 400 }
      );
    }

    const validation =
      await validateTransactionRelations(
        body
      );

    if (validation.errorResponse) {
      return validation.errorResponse;
    }

    if (normalizedCurrency !== validation.accountCurrency) {
      return NextResponse.json(
        {
          error: "Transaction currency must match the account currency.",
        },
        { status: 400 }
      );
    }

    const description =
      cleanNullableString(
        body.description
      );

    const paymentMethod =
      cleanNullableString(
        body.payment_method
      );

    const notes =
      cleanNullableString(body.notes);

    const {
      data: transaction,
      error: insertError,
    } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: validation.userId,
        space_id: validation.spaceId,
        account_id: validation.accountId,
        category_id: validation.categoryId,
        type: body.type,
        amount: body.amount,
        currency: normalizedCurrency,
        occurred_at:
          body.occurred_at ??
          new Date().toISOString(),
        description:
          description ?? null,
        payment_method:
          paymentMethod ?? null,
        notes: notes ?? null,
      })
      .select("*")
      .single();

    if (insertError || !transaction) {
      console.error(
        "Super Admin transaction insert error:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "Failed to create transaction.",
        },
        { status: 500 }
      );
    }

    const { error: auditError } =
      await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: actor.id,
          action:
            "TRANSACTION_CREATE",
          entity_type:
            "transaction",
          entity_id:
            transaction.id,
          space_id:
            transaction.space_id,
          details: {
            new_values:
              buildAuditSnapshot(
                transaction as Record<
                  string,
                  unknown
                >
              ),
          },
        });

    if (auditError) {
      console.error(
        "Transaction create audit log error:",
        auditError
      );
    }

    return NextResponse.json(
      {
        success: true,
        transaction,
        message:
          "Transaction created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Super Admin transactions POST API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request
) {
  try {
    const {
      user: actor,
      errorResponse,
    } = await requireSuperAdmin();

    if (errorResponse || !actor) {
      return (
        errorResponse ??
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    let body: TransactionWriteBody & {
      id?: string;
    };

    try {
      body =
        (await request.json()) as TransactionWriteBody & {
          id?: string;
        };
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const transactionId =
      body.id?.trim();

    if (
      !transactionId ||
      !isValidUuid(transactionId)
    ) {
      return NextResponse.json(
        {
          error:
            "Valid transaction id is required.",
        },
        { status: 400 }
      );
    }

    const {
      data: currentTransaction,
      error: currentError,
    } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle();

    if (currentError) {
      console.error(
        "Super Admin transaction lookup error:",
        currentError
      );

      return NextResponse.json(
        {
          error:
            "Failed to load transaction.",
        },
        { status: 500 }
      );
    }

    if (!currentTransaction) {
      return NextResponse.json(
        {
          error:
            "Transaction not found.",
        },
        { status: 404 }
      );
    }

    if (
      body.type !== undefined &&
      !isValidTransactionType(body.type)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid transaction type.",
        },
        { status: 400 }
      );
    }

    if (
      body.amount !== undefined &&
      (typeof body.amount !== "number" ||
        !Number.isFinite(body.amount) ||
        body.amount <= 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Amount must be a positive number.",
        },
        { status: 400 }
      );
    }

    if (
      body.currency !== undefined &&
      (typeof body.currency !== "string" ||
        !isValidCurrencyCode(body.currency))
    ) {
      return NextResponse.json(
        {
          error: "Currency must be a three-letter code.",
        },
        { status: 400 }
      );
    }

    if (
      body.occurred_at !== undefined &&
      (typeof body.occurred_at !== "string" ||
        !isValidDate(body.occurred_at))
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid occurred_at date.",
        },
        { status: 400 }
      );
    }

    const validation =
      await validateTransactionRelations(
        body,
        currentTransaction as {
          user_id: string | null;
          space_id: string;
          account_id: string;
          category_id: string | null;
          type: TransactionType;
          amount: number;
          currency: string;
          occurred_at: string;
          description: string | null;
          payment_method: string | null;
          notes: string | null;
        }
      );

    if (validation.errorResponse) {
      return validation.errorResponse;
    }

    const effectiveCurrency =
      body.currency !== undefined
        ? body.currency.trim().toUpperCase()
        : String(currentTransaction.currency ?? "").toUpperCase();

    if (effectiveCurrency !== validation.accountCurrency) {
      return NextResponse.json(
        {
          error: "Transaction currency must match the account currency.",
        },
        { status: 400 }
      );
    }

    const updateData: Record<
      string,
      unknown
    > = {};

    if (body.user_id !== undefined) {
      updateData.user_id =
        validation.userId;
    }

    if (body.space_id !== undefined) {
      updateData.space_id =
        validation.spaceId;
    }

    if (body.account_id !== undefined) {
      updateData.account_id =
        validation.accountId;
    }

    if (body.category_id !== undefined) {
      updateData.category_id =
        validation.categoryId;
    }

    if (body.type !== undefined) {
      updateData.type =
        body.type;
    }

    if (body.amount !== undefined) {
      updateData.amount =
        body.amount;
    }

    if (body.currency !== undefined) {
      updateData.currency =
        body.currency.trim().toUpperCase();
    }

    if (body.occurred_at !== undefined) {
      updateData.occurred_at =
        body.occurred_at;
    }

    if (body.description !== undefined) {
      updateData.description =
        cleanNullableString(
          body.description
        );
    }

    if (
      body.payment_method !==
      undefined
    ) {
      updateData.payment_method =
        cleanNullableString(
          body.payment_method
        );
    }

    if (body.notes !== undefined) {
      updateData.notes =
        cleanNullableString(
          body.notes
        );
    }

    if (
      Object.keys(updateData).length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "No transaction fields were provided for update.",
        },
        { status: 400 }
      );
    }

    const {
      data: updatedTransaction,
      error: updateError,
    } = await supabaseAdmin
      .from("transactions")
      .update(updateData)
      .eq("id", transactionId)
      .select("*")
      .single();

    if (
      updateError ||
      !updatedTransaction
    ) {
      console.error(
        "Super Admin transaction update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Failed to update transaction.",
        },
        { status: 500 }
      );
    }

    const {
      error: auditError,
    } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        actor_id: actor.id,
        action:
          "TRANSACTION_UPDATE",
        entity_type:
          "transaction",
        entity_id:
          updatedTransaction.id,
        space_id:
          updatedTransaction.space_id,
        details: {
          old_values:
            buildAuditSnapshot(
              currentTransaction as Record<
                string,
                unknown
              >
            ),
          new_values:
            buildAuditSnapshot(
              updatedTransaction as Record<
                string,
                unknown
              >
            ),
        },
      });

    if (auditError) {
      console.error(
        "Transaction update audit log error:",
        auditError
      );
    }

    return NextResponse.json({
      success: true,
      transaction:
        updatedTransaction,
      message:
        "Transaction updated successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin transactions PATCH API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request
) {
  try {
    const {
      user: actor,
      errorResponse,
    } = await requireSuperAdmin();

    if (errorResponse || !actor) {
      return (
        errorResponse ??
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    let body: {
      id?: string;
    };

    try {
      body =
        (await request.json()) as {
          id?: string;
        };
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const transactionId =
      body.id?.trim();

    if (
      !transactionId ||
      !isValidUuid(transactionId)
    ) {
      return NextResponse.json(
        {
          error:
            "Valid transaction id is required.",
        },
        { status: 400 }
      );
    }

    const {
      data: transaction,
      error: transactionError,
    } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle();

    if (transactionError) {
      console.error(
        "Super Admin transaction delete lookup error:",
        transactionError
      );

      return NextResponse.json(
        {
          error:
            "Failed to load transaction.",
        },
        { status: 500 }
      );
    }

    if (!transaction) {
      return NextResponse.json(
        {
          error:
            "Transaction not found.",
        },
        { status: 404 }
      );
    }

    const { error: deleteError } =
      await supabaseAdmin
        .from("transactions")
        .delete()
        .eq("id", transactionId);

    if (deleteError) {
      console.error(
        "Super Admin transaction delete error:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "Failed to delete transaction.",
        },
        { status: 500 }
      );
    }

    const { error: auditError } =
      await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: actor.id,
          action:
            "TRANSACTION_DELETE",
          entity_type:
            "transaction",
          entity_id:
            transaction.id,
          space_id:
            transaction.space_id,
          details: {
            old_values:
              buildAuditSnapshot(
                transaction as Record<
                  string,
                  unknown
                >
              ),
        },
        });

    if (auditError) {
      console.error(
        "Transaction delete audit log error:",
        auditError
      );
    }

    return NextResponse.json({
      success: true,
      deletedTransactionId:
        transaction.id,
      message:
        "Transaction deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin transactions DELETE API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      { status: 500 }
    );
  }
}
