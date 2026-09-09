import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type BudgetType = {
  id: string;
  user_id: string;
  space_id: string;
  category_id: string;
  name: string;
  amount: number | string;
  spent: number | string | null;
  start_date: string;
  end_date: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type BudgetBody = {
  user_id?: string;
  space_id?: string;
  category_id?: string;
  name?: string;
  amount?: number;
  spent?: number;
  start_date?: string;
  end_date?: string;
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
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Super Admin budgets profile check error:",
      profileError
    );

    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          error: "Profile check failed",
        },
        {
          status: 500,
        }
      ),
    };
  }

  if (!profile) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          error: "Profile not found",
        },
        {
          status: 404,
        }
      ),
    };
  }

  if (profile.role !== "super_admin") {
    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    user,
    errorResponse: null,
  };
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00.000Z`
  );

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

async function validateRelations(
  userId: string,
  spaceId: string,
  categoryId: string
) {
  const [
    { data: targetUser, error: userError },
    { data: space, error: spaceError },
    { data: category, error: categoryError },
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, username, email, role"
      )
      .eq("id", userId)
      .maybeSingle(),

    supabaseAdmin
      .from("spaces")
      .select(
        "id, name, type, base_currency"
      )
      .eq("id", spaceId)
      .maybeSingle(),

    supabaseAdmin
      .from("categories")
      .select(
        "id, name, space_id"
      )
      .eq("id", categoryId)
      .maybeSingle(),
  ]);

  if (userError) {
    console.error(
      "Budget target user lookup error:",
      userError
    );

    return {
      errorResponse: NextResponse.json(
        {
          error:
            "Failed to verify target user.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  if (!targetUser) {
    return {
      errorResponse: NextResponse.json(
        {
          error:
            "Target user not found.",
        },
        {
          status: 404,
        }
      ),
    };
  }

  if (spaceError) {
    console.error(
      "Budget space lookup error:",
      spaceError
    );

    return {
      errorResponse: NextResponse.json(
        {
          error:
            "Failed to verify budget space.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  if (!space) {
    return {
      errorResponse: NextResponse.json(
        {
          error: "Space not found.",
        },
        {
          status: 404,
        }
      ),
    };
  }

  if (categoryError) {
    console.error(
      "Budget category lookup error:",
      categoryError
    );

    return {
      errorResponse: NextResponse.json(
        {
          error:
            "Failed to verify budget category.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  if (!category) {
    return {
      errorResponse: NextResponse.json(
        {
          error:
            "Category not found.",
        },
        {
          status: 404,
        }
      ),
    };
  }

  if (
    category.space_id !==
    space.id
  ) {
    return {
      errorResponse: NextResponse.json(
        {
          error:
            "The selected category does not belong to the selected space.",
        },
        {
          status: 400,
        }
      ),
    };
  }

  // A budget must belong to a Space member so that
  // the target user can actually access the budget.
  const {
    data: membership,
    error: membershipError,
  } = await supabaseAdmin
    .from("space_members")
    .select(
      "space_id, user_id, role"
    )
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "Budget membership lookup error:",
      membershipError
    );

    return {
      errorResponse: NextResponse.json(
        {
          error:
            "Failed to verify target user's space membership.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  if (!membership) {
    return {
      errorResponse: NextResponse.json(
        {
          error:
            "The selected user is not a member of the selected space.",
        },
        {
          status: 409,
        }
      ),
    };
  }

  return {
    errorResponse: null,
    targetUser,
    space,
    category,
  };
}

// --------------------------------------------------
// GET - all budgets
// --------------------------------------------------

export async function GET(
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
          {
            error: "Unauthorized",
          },
          {
            status: 401,
          }
        )
      );
    }

    const url = new URL(
      request.url
    );

    const search =
      url.searchParams
        .get("search")
        ?.trim() ?? "";

    const userId =
      url.searchParams.get(
        "user_id"
      ) ?? "";

    const spaceId =
      url.searchParams.get(
        "space_id"
      ) ?? "";

    const categoryId =
      url.searchParams.get(
        "category_id"
      ) ?? "";

    const dateFrom =
      url.searchParams.get(
        "date_from"
      ) ?? "";

    const dateTo =
      url.searchParams.get(
        "date_to"
      ) ?? "";

    const minAmountValue =
      url.searchParams.get(
        "min_amount"
      ) ?? "";

    const maxAmountValue =
      url.searchParams.get(
        "max_amount"
      ) ?? "";

    let minAmount: number | null =
      null;

    let maxAmount: number | null =
      null;

    if (minAmountValue) {
      const parsed =
        Number(minAmountValue);

      if (!Number.isFinite(parsed)) {
        return NextResponse.json(
          {
            error:
              "Invalid minimum amount.",
          },
          {
            status: 400,
          }
        );
      }

      minAmount = parsed;
    }

    if (maxAmountValue) {
      const parsed =
        Number(maxAmountValue);

      if (!Number.isFinite(parsed)) {
        return NextResponse.json(
          {
            error:
              "Invalid maximum amount.",
          },
          {
            status: 400,
          }
        );
      }

      maxAmount = parsed;
    }

    if (
      dateFrom &&
      !isValidDate(dateFrom)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid date_from.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      dateTo &&
      !isValidDate(dateTo)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid date_to.",
        },
        {
          status: 400,
        }
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
        {
          status: 400,
        }
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
        {
          status: 400,
        }
      );
    }

    let query = supabaseAdmin
      .from("budgets")
      .select(
        `
          id,
          user_id,
          space_id,
          category_id,
          name,
          amount,
          spent,
          start_date,
          end_date,
          created_at,
          updated_at
        `
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(500);

    if (userId) {
      query = query.eq(
        "user_id",
        userId
      );
    }

    if (spaceId) {
      query = query.eq(
        "space_id",
        spaceId
      );
    }

    if (categoryId) {
      query = query.eq(
        "category_id",
        categoryId
      );
    }

    if (dateFrom) {
      query = query.gte(
        "start_date",
        dateFrom
      );
    }

    if (dateTo) {
      query = query.lte(
        "end_date",
        dateTo
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
      data: budgets,
      error: budgetsError,
    } = await query;

    if (budgetsError) {
      console.error(
        "Super Admin budgets query error:",
        budgetsError
      );

      return NextResponse.json(
        {
          error:
            "Failed to load budgets.",
        },
        {
          status: 500,
        }
      );
    }

    const rows =
      (budgets ??
        []) as BudgetType[];

    const userIds =
      Array.from(
        new Set(
          rows
            .map(
              (budget) =>
                budget.user_id
            )
            .filter(Boolean)
        )
      );

    const spaceIds =
      Array.from(
        new Set(
          rows
            .map(
              (budget) =>
                budget.space_id
            )
            .filter(Boolean)
        )
      );

    const categoryIds =
      Array.from(
        new Set(
          rows
            .map(
              (budget) =>
                budget.category_id
            )
            .filter(Boolean)
        )
      );

    const [
      profilesResult,
      spacesResult,
      categoriesResult,
    ] = await Promise.all([
      userIds.length > 0
        ? supabaseAdmin
            .from("profiles")
            .select(
              `
                id,
                full_name,
                username,
                email,
                role
              `
            )
            .in(
              "id",
              userIds
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      spaceIds.length > 0
        ? supabaseAdmin
            .from("spaces")
            .select(
              `
                id,
                name,
                type,
                base_currency
              `
            )
            .in(
              "id",
              spaceIds
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      categoryIds.length > 0
        ? supabaseAdmin
            .from("categories")
            .select(
              `
                id,
                name,
                space_id
              `
            )
            .in(
              "id",
              categoryIds
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (
      profilesResult.error ||
      spacesResult.error ||
      categoriesResult.error
    ) {
      console.error(
        "Super Admin budgets relation lookup error:",
        profilesResult.error ??
          spacesResult.error ??
          categoriesResult.error
      );

      return NextResponse.json(
        {
          error:
            "Failed to load budget details.",
        },
        {
          status: 500,
        }
      );
    }

    const profilesById =
      new Map(
        (
          profilesResult.data ??
          []
        ).map(
          (profile) => [
            profile.id,
            profile,
          ]
        )
      );

    const spacesById =
      new Map(
        (
          spacesResult.data ??
          []
        ).map(
          (space) => [
            space.id,
            space,
          ]
        )
      );

    const categoriesById =
      new Map(
        (
          categoriesResult.data ??
          []
        ).map(
          (category) => [
            category.id,
            category,
          ]
        )
      );

    const normalizedSearch =
      search.toLowerCase();

    const filteredRows =
      normalizedSearch
        ? rows.filter(
            (budget) => {
              const profile =
                profilesById.get(
                  budget.user_id
                );

              const space =
                spacesById.get(
                  budget.space_id
                );

              const category =
                categoriesById.get(
                  budget.category_id
                );

              const searchableText =
                [
                  budget.name,
                  budget.amount,
                  budget.spent,
                  budget.start_date,
                  budget.end_date,
                  profile?.full_name,
                  profile?.username,
                  profile?.email,
                  space?.name,
                  category?.name,
                ]
                  .filter(
                    (
                      value
                    ) =>
                      value !==
                        null &&
                      value !==
                        undefined
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

      budgets:
        filteredRows.map(
          (budget) => ({
            ...budget,

            user:
              profilesById.get(
                budget.user_id
              ) ?? null,

            space:
              spacesById.get(
                budget.space_id
              ) ?? null,

            category:
              categoriesById.get(
                budget.category_id
              ) ?? null,
          })
        ),

      total:
        filteredRows.length,

      limited:
        rows.length >= 500,

      options: {
        users:
          profilesResult.data ??
          [],
        spaces:
          spacesResult.data ??
          [],
        categories:
          categoriesResult.data ??
          [],
      },
    });
  } catch (error) {
    console.error(
      "Super Admin budgets GET API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}

// --------------------------------------------------
// POST - create budget
// --------------------------------------------------

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
          {
            error: "Unauthorized",
          },
          {
            status: 401,
          }
        )
      );
    }

    let body: BudgetBody;

    try {
      body =
        (await request.json()) as BudgetBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid JSON body.",
        },
        {
          status: 400,
        }
      );
    }

    const userId =
      body.user_id?.trim();

    const spaceId =
      body.space_id?.trim();

    const categoryId =
      body.category_id?.trim();

    const name =
      body.name?.trim();

    const amount = Number(
      body.amount
    );

    const spent =
      body.spent === undefined
        ? 0
        : Number(body.spent);

    const startDate =
      body.start_date?.trim();

    const endDate =
      body.end_date?.trim();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!spaceId) {
      return NextResponse.json(
        {
          error:
            "Space ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        {
          error:
            "Category ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Budget name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Budget amount must be a positive number.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        spent
      ) ||
      spent < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Spent amount must be a valid non-negative number.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      spent > amount
    ) {
      return NextResponse.json(
        {
          error:
            "Spent amount cannot exceed budget amount.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !startDate ||
      !isValidDate(startDate)
    ) {
      return NextResponse.json(
        {
          error:
            "Valid start_date is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !endDate ||
      !isValidDate(endDate)
    ) {
      return NextResponse.json(
        {
          error:
            "Valid end_date is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      startDate > endDate
    ) {
      return NextResponse.json(
        {
          error:
            "Start date cannot be later than end date.",
        },
        {
          status: 400,
        }
      );
    }

    const relations =
      await validateRelations(
        userId,
        spaceId,
        categoryId
      );

    if (
      relations.errorResponse
    ) {
      return relations.errorResponse;
    }

    const {
      data: createdBudget,
      error: createError,
    } = await supabaseAdmin
      .from("budgets")
      .insert({
        user_id:
          userId,
        space_id:
          spaceId,
        category_id:
          categoryId,
        name,
        amount,
        spent,
        start_date:
          startDate,
        end_date:
          endDate,
      })
      .select("*")
      .single();

    if (
      createError ||
      !createdBudget
    ) {
      console.error(
        "Super Admin budget create error:",
        createError
      );

      return NextResponse.json(
        {
          error:
            "Failed to create budget.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: auditError,
    } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        actor_id:
          actor.id,
        action:
          "BUDGET_CREATE",
        entity_type:
          "budget",
        entity_id:
          createdBudget.id,
        details: {
          new_values:
            createdBudget,
        },
      });

    if (auditError) {
      console.error(
        "Budget create audit log error:",
        auditError
      );
    }

    return NextResponse.json(
      {
        success: true,
        budget:
          createdBudget,
        message:
          "Budget created successfully.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Super Admin budget POST API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}

// --------------------------------------------------
// PATCH - update budget
// --------------------------------------------------

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
          {
            error: "Unauthorized",
          },
          {
            status: 401,
          }
        )
      );
    }

    let body: BudgetBody & {
      id?: string;
    };

    try {
      body =
        (await request.json()) as BudgetBody & {
          id?: string;
        };
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid JSON body.",
        },
        {
          status: 400,
        }
      );
    }

    const id =
      body.id?.trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Budget ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: currentBudget,
      error: currentBudgetError,
    } = await supabaseAdmin
      .from("budgets")
      .select("*")
      .eq("id", id)
      .single();

    if (
      currentBudgetError ||
      !currentBudget
    ) {
      console.error(
        "Current budget lookup error:",
        currentBudgetError
      );

      return NextResponse.json(
        {
          error:
            "Budget not found.",
        },
        {
          status: 404,
        }
      );
    }

    const nextUserId =
      body.user_id !== undefined
        ? body.user_id.trim()
        : currentBudget.user_id;

    const nextSpaceId =
      body.space_id !== undefined
        ? body.space_id.trim()
        : currentBudget.space_id;

    const nextCategoryId =
      body.category_id !== undefined
        ? body.category_id.trim()
        : currentBudget.category_id;

    const nextName =
      body.name !== undefined
        ? body.name.trim()
        : currentBudget.name;

    const nextAmount =
      body.amount !== undefined
        ? Number(body.amount)
        : Number(
            currentBudget.amount
          );

    const nextSpent =
      body.spent !== undefined
        ? Number(body.spent)
        : Number(
            currentBudget.spent ??
              0
          );

    const nextStartDate =
      body.start_date !== undefined
        ? body.start_date.trim()
        : currentBudget.start_date;

    const nextEndDate =
      body.end_date !== undefined
        ? body.end_date.trim()
        : currentBudget.end_date;

    if (!nextUserId) {
      return NextResponse.json(
        {
          error:
            "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!nextSpaceId) {
      return NextResponse.json(
        {
          error:
            "Space ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!nextCategoryId) {
      return NextResponse.json(
        {
          error:
            "Category ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!nextName) {
      return NextResponse.json(
        {
          error:
            "Budget name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        nextAmount
      ) ||
      nextAmount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Budget amount must be a positive number.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        nextSpent
      ) ||
      nextSpent < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Spent amount must be a valid non-negative number.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      nextSpent > nextAmount
    ) {
      return NextResponse.json(
        {
          error:
            "Spent amount cannot exceed budget amount.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isValidDate(
        nextStartDate
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Valid start_date is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isValidDate(
        nextEndDate
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Valid end_date is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      nextStartDate >
      nextEndDate
    ) {
      return NextResponse.json(
        {
          error:
            "Start date cannot be later than end date.",
        },
        {
          status: 400,
        }
      );
    }

    const relations =
      await validateRelations(
        nextUserId,
        nextSpaceId,
        nextCategoryId
      );

    if (
      relations.errorResponse
    ) {
      return relations.errorResponse;
    }

    const updatedValues = {
      user_id:
        nextUserId,
      space_id:
        nextSpaceId,
      category_id:
        nextCategoryId,
      name:
        nextName,
      amount:
        nextAmount,
      spent:
        nextSpent,
      start_date:
        nextStartDate,
      end_date:
        nextEndDate,
    };

    const {
      data: updatedBudget,
      error: updateError,
    } = await supabaseAdmin
      .from("budgets")
      .update(
        updatedValues
      )
      .eq("id", id)
      .select("*")
      .single();

    if (
      updateError ||
      !updatedBudget
    ) {
      console.error(
        "Super Admin budget update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Failed to update budget.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: auditError,
    } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        actor_id:
          actor.id,
        action:
          "BUDGET_UPDATE",
        entity_type:
          "budget",
        entity_id:
          id,
        details: {
          old_values:
            currentBudget,
          new_values:
            updatedBudget,
        },
      });

    if (auditError) {
      console.error(
        "Budget update audit log error:",
        auditError
      );
    }

    return NextResponse.json({
      success: true,
      budget:
        updatedBudget,
      message:
        "Budget updated successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin budget PATCH API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}

// --------------------------------------------------
// DELETE - delete budget
// --------------------------------------------------

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
          {
            error: "Unauthorized",
          },
          {
            status: 401,
          }
        )
      );
    }

    let body: {
      id?: string;
    } = {};

    try {
      body =
        (await request.json()) as {
          id?: string;
        };
    } catch {
      // Allow id through query string as well.
    }

    const url = new URL(
      request.url
    );

    const id =
      body.id?.trim() ||
      url.searchParams
        .get("id")
        ?.trim() ||
      "";

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Budget ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: currentBudget,
      error: currentBudgetError,
    } = await supabaseAdmin
      .from("budgets")
      .select("*")
      .eq("id", id)
      .single();

    if (
      currentBudgetError ||
      !currentBudget
    ) {
      return NextResponse.json(
        {
          error:
            "Budget not found.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      error: deleteError,
    } = await supabaseAdmin
      .from("budgets")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "Super Admin budget delete error:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "Failed to delete budget.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: auditError,
    } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        actor_id:
          actor.id,
        action:
          "BUDGET_DELETE",
        entity_type:
          "budget",
        entity_id:
          id,
        details: {
          old_values:
            currentBudget,
        },
      });

    if (auditError) {
      console.error(
        "Budget delete audit log error:",
        auditError
      );
    }

    return NextResponse.json({
      success: true,
      deletedBudgetId:
        id,
      message:
        "Budget deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin budget DELETE API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}