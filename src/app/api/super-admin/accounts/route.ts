import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidCurrencyCode } from "@/lib/currency";

type AccountBody = {
  space_id?: string;
  name?: string;
  type?: string;
  currency?: string;
  opening_balance?: number;
  description?: string | null;
  is_archived?: boolean;
  owner_id?: string | null;
};

type AccountRow = {
  id: string;
  space_id: string;
  name: string;
  type: string;
  currency: string;
  opening_balance: number | string | null;
  description: string | null;
  is_archived: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  role?: string | null;
};

type TransactionRow = {
  account_id: string;
  amount: number | string | null;
  type: string;
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

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Super Admin accounts profile check error:",
      profileError
    );

    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          error: "Profile check failed",
          details: profileError.message,
          code: profileError.code,
        },
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

  return { user, errorResponse: null };
}

async function validateOwnerAndSpace(
  ownerId: string,
  spaceId: string
) {
  const [ownerResult, spaceResult, membershipResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, username, email, role")
      .eq("id", ownerId)
      .maybeSingle(),

    supabaseAdmin
      .from("spaces")
      .select("id, name, type, base_currency, owner_id")
      .eq("id", spaceId)
      .maybeSingle(),

    supabaseAdmin
      .from("space_members")
      .select("space_id, user_id, role")
      .eq("space_id", spaceId)
      .eq("user_id", ownerId)
      .maybeSingle(),
  ]);

  if (ownerResult.error) {
    return {
      errorResponse: NextResponse.json(
        {
          error: "Failed to verify account owner.",
          details: ownerResult.error.message,
          code: ownerResult.error.code,
        },
        { status: 500 }
      ),
    };
  }

  if (!ownerResult.data) {
    return {
      errorResponse: NextResponse.json(
        { error: "Selected owner was not found." },
        { status: 404 }
      ),
    };
  }

  if (spaceResult.error) {
    return {
      errorResponse: NextResponse.json(
        {
          error: "Failed to verify account space.",
          details: spaceResult.error.message,
          code: spaceResult.error.code,
        },
        { status: 500 }
      ),
    };
  }

  if (!spaceResult.data) {
    return {
      errorResponse: NextResponse.json(
        { error: "Selected space was not found." },
        { status: 404 }
      ),
    };
  }

  // The account owner must be able to access the space.
  // The existing account owner update route follows the same rule.
  if (ownerId !== spaceResult.data.owner_id && !membershipResult.data) {
    return {
      errorResponse: NextResponse.json(
        {
          error: "The selected owner is not a member of the selected space.",
        },
        { status: 409 }
      ),
    };
  }

  return {
    errorResponse: null,
    owner: ownerResult.data as ProfileRow,
    space: spaceResult.data,
  };
}

async function enrichAccounts(rows: AccountRow[]) {
  const ownerIds = Array.from(
    new Set(rows.map((row) => row.created_by).filter(Boolean))
  ) as string[];

  const spaceIds = Array.from(
    new Set(rows.map((row) => row.space_id).filter(Boolean))
  );

  const [profilesResult, spacesResult, transactionsResult] = await Promise.all([
    ownerIds.length
      ? supabaseAdmin
          .from("profiles")
          .select("id, full_name, username, email, role")
          .in("id", ownerIds)
      : Promise.resolve({ data: [], error: null }),

    spaceIds.length
      ? supabaseAdmin
          .from("spaces")
          .select("id, name, type, base_currency, owner_id")
          .in("id", spaceIds)
      : Promise.resolve({ data: [], error: null }),

    rows.length
      ? supabaseAdmin
          .from("transactions")
          .select("account_id, amount, type")
          .in(
            "account_id",
            rows.map((row) => row.id)
          )
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error || spacesResult.error || transactionsResult.error) {
    return {
      errorResponse: NextResponse.json(
        {
          error: "Failed to load account details.",
          details:
            profilesResult.error?.message ??
            spacesResult.error?.message ??
            transactionsResult.error?.message,
          code:
            profilesResult.error?.code ??
            spacesResult.error?.code ??
            transactionsResult.error?.code,
        },
        { status: 500 }
      ),
    };
  }

  const profilesById = new Map(
    ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile,
    ])
  );

  const spacesById = new Map(
    (spacesResult.data ?? []).map((space) => [space.id, space])
  );

  const statsByAccount = new Map<
    string,
    { count: number; income: number; expenses: number }
  >();

  for (const transaction of (transactionsResult.data ?? []) as TransactionRow[]) {
    const amount = Number(transaction.amount ?? 0);
    if (!transaction.account_id || !Number.isFinite(amount)) continue;

    const stats =
      statsByAccount.get(transaction.account_id) ?? {
        count: 0,
        income: 0,
        expenses: 0,
      };

    stats.count += 1;

    if (transaction.type === "income") stats.income += amount;
    if (transaction.type === "expense") stats.expenses += amount;

    statsByAccount.set(transaction.account_id, stats);
  }

  return {
    errorResponse: null,
    accounts: rows.map((account) => {
      const stats =
        statsByAccount.get(account.id) ?? {
          count: 0,
          income: 0,
          expenses: 0,
        };

      const openingBalance = Number(account.opening_balance ?? 0);

      return {
        ...account,
        owner: account.created_by
          ? profilesById.get(account.created_by) ?? null
          : null,
        space: spacesById.get(account.space_id) ?? null,
        transactions_count: stats.count,
        total_income: stats.income,
        total_expenses: stats.expenses,
        current_balance:
          openingBalance + stats.income - stats.expenses,
      };
    }),
  };
}

// ==================================================
// GET
// ==================================================

export async function GET() {
  try {
    const { user, errorResponse } = await requireSuperAdmin();

    if (errorResponse || !user) {
      return (
        errorResponse ??
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { data: rows, error } = await supabaseAdmin
      .from("accounts")
      .select(
        `
          id,
          space_id,
          name,
          type,
          currency,
          opening_balance,
          description,
          is_archived,
          created_by,
          created_at,
          updated_at
        `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Accounts query error:", error);
      return NextResponse.json(
        {
          error: "Failed to load accounts.",
          details: error.message,
          code: error.code,
          hint: error.hint ?? null,
        },
        { status: 500 }
      );
    }

    const enriched = await enrichAccounts((rows ?? []) as AccountRow[]);

    if (enriched.errorResponse) return enriched.errorResponse;

    const [{ data: users, error: usersError }, { data: spaces, error: spacesError }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, full_name, username, email, role")
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("spaces")
          .select("id, name, type, base_currency, owner_id")
          .order("created_at", { ascending: false }),
      ]);

    if (usersError || spacesError) {
      return NextResponse.json(
        {
          error: "Failed to load account options.",
          details: usersError?.message ?? spacesError?.message,
          code: usersError?.code ?? spacesError?.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accounts: enriched.accounts,
      options: {
        users: users ?? [],
        spaces: spaces ?? [],
      },
    });
  } catch (error) {
    console.error("Super Admin accounts GET error:", error);

    return NextResponse.json(
      {
        error: "Internal server error.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ==================================================
// POST - create account
// ==================================================

export async function POST(request: Request) {
  try {
    const { user: actor, errorResponse } = await requireSuperAdmin();

    if (errorResponse || !actor) {
      return (
        errorResponse ??
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    let body: AccountBody;

    try {
      body = (await request.json()) as AccountBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const spaceId = body.space_id?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    const type = body.type?.trim() ?? "";
    const currency = body.currency?.trim().toUpperCase() ?? "";
    const description =
      body.description === null || body.description === undefined
        ? null
        : body.description.trim() || null;
    const ownerId =
      body.owner_id === null || body.owner_id === undefined
        ? null
        : body.owner_id.trim();
    const openingBalance = Number(body.opening_balance ?? 0);
    const isArchived = Boolean(body.is_archived ?? false);

    if (!spaceId) {
      return NextResponse.json(
        { error: "Space ID is required." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Account name is required." },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: "Account type is required." },
        { status: 400 }
      );
    }

    if (!isValidCurrencyCode(currency)) {
      return NextResponse.json(
        { error: "Currency must be a three-letter code." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(openingBalance)) {
      return NextResponse.json(
        { error: "Opening balance must be a valid number." },
        { status: 400 }
      );
    }

    const effectiveOwnerId = ownerId || actor.id;

    const relations = await validateOwnerAndSpace(
      effectiveOwnerId,
      spaceId
    );

    if (relations.errorResponse) return relations.errorResponse;

    const { data: createdAccount, error: createError } = await supabaseAdmin
      .from("accounts")
      .insert({
        created_by: effectiveOwnerId,
        space_id: spaceId,
        name,
        type,
        currency,
        opening_balance: openingBalance,
        description,
        is_archived: isArchived,
      })
      .select(
        `
          id,
          space_id,
          name,
          type,
          currency,
          opening_balance,
          description,
          is_archived,
          created_by,
          created_at,
          updated_at
        `
      )
      .single();

    if (createError || !createdAccount) {
      console.error("Super Admin account create error:", createError);

      return NextResponse.json(
        {
          error: "Failed to create account.",
          details: createError?.message ?? "Unknown database error.",
          code: createError?.code ?? null,
          hint: createError?.hint ?? null,
        },
        { status: createError?.code === "23505" ? 409 : 500 }
      );
    }

    const { error: auditError } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        actor_id: actor.id,
        space_id: spaceId,
        action: "ACCOUNT_CREATE",
        entity_type: "account",
        entity_id: createdAccount.id,
        details: {
          new_values: createdAccount,
        },
      });

    if (auditError) {
      console.error("Account create audit log error:", auditError);
    }

    return NextResponse.json(
      {
        success: true,
        account: createdAccount,
        message: "Account created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Super Admin accounts POST error:", error);

    return NextResponse.json(
      {
        error: "Internal server error.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
