import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SavingRow = {
  id: string;
  user_id: string;
  space_id: string;
  name: string;
  target_amount: number | string;
  current_amount: number | string;
  deadline: string;
  created_at: string | null;
};

type SavingBody = {
  user_id?: string;
  space_id?: string;
  name?: string;
  target_amount?: number;
  current_amount?: number;
  deadline?: string;
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
      "Super Admin savings profile check error:",
      profileError
    );

    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          error: "Profile check failed",
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

  return {
    user,
    errorResponse: null,
  };
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

async function validateUserAndSpace(
  userId: string,
  spaceId: string
) {
  const [
    { data: targetUser, error: userError },
    { data: space, error: spaceError },
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
  ]);

  if (userError) {
    console.error(
      "Saving target user lookup error:",
      userError
    );

    return {
      errorResponse: NextResponse.json(
        {
          error:
            "Failed to verify target user.",
        },
        { status: 500 }
      ),
    };
  }

  if (!targetUser) {
    return {
      errorResponse: NextResponse.json(
        {
          error: "Target user not found.",
        },
        { status: 404 }
      ),
    };
  }

  if (spaceError) {
    console.error(
      "Saving space lookup error:",
      spaceError
    );

    return {
      errorResponse: NextResponse.json(
        {
          error: "Failed to verify space.",
        },
        { status: 500 }
      ),
    };
  }

  if (!space) {
    return {
      errorResponse: NextResponse.json(
        {
          error: "Space not found.",
        },
        { status: 404 }
      ),
    };
  }

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
      "Saving membership lookup error:",
      membershipError
    );

    return {
      errorResponse: NextResponse.json(
        {
          error:
            "Failed to verify user's space membership.",
        },
        { status: 500 }
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
        { status: 409 }
      ),
    };
  }

  return {
    errorResponse: null,
    targetUser,
    space,
  };
}

// ==================================================
// GET - Load all savings
// ==================================================

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
          { error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    const { searchParams } = new URL(
      request.url
    );

    const search =
      searchParams.get("search")?.trim() ?? "";

    const userId =
      searchParams.get("user_id")?.trim() ?? "";

    const spaceId =
      searchParams.get("space_id")?.trim() ?? "";

    const dateFrom =
      searchParams.get("date_from")?.trim() ?? "";

    const dateTo =
      searchParams.get("date_to")?.trim() ?? "";

    const minAmountValue =
      searchParams.get("min_amount")?.trim() ?? "";

    const maxAmountValue =
      searchParams.get("max_amount")?.trim() ?? "";

    let minAmount: number | null = null;
    let maxAmount: number | null = null;

    if (minAmountValue) {
      const parsed = Number(
        minAmountValue
      );

      if (!Number.isFinite(parsed)) {
        return NextResponse.json(
          {
            error:
              "Invalid minimum amount.",
          },
          { status: 400 }
        );
      }

      minAmount = parsed;
    }

    if (maxAmountValue) {
      const parsed = Number(
        maxAmountValue
      );

      if (!Number.isFinite(parsed)) {
        return NextResponse.json(
          {
            error:
              "Invalid maximum amount.",
          },
          { status: 400 }
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
          error: "Invalid date_from.",
        },
        { status: 400 }
      );
    }

    if (
      dateTo &&
      !isValidDate(dateTo)
    ) {
      return NextResponse.json(
        {
          error: "Invalid date_to.",
        },
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
      .from("savings")
      .select(
        `
          id,
          user_id,
          space_id,
          name,
          target_amount,
          current_amount,
          deadline,
          created_at
        `
      )
      .order("created_at", {
        ascending: false,
      })
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

    if (dateFrom) {
      query = query.gte(
        "deadline",
        dateFrom
      );
    }

    if (dateTo) {
      query = query.lte(
        "deadline",
        dateTo
      );
    }

    if (minAmount !== null) {
      query = query.gte(
        "target_amount",
        minAmount
      );
    }

    if (maxAmount !== null) {
      query = query.lte(
        "target_amount",
        maxAmount
      );
    }

    const {
      data: savings,
      error: savingsError,
    } = await query;

    if (savingsError) {
      console.error(
        "Super Admin savings query error:",
        savingsError
      );

      return NextResponse.json(
        {
          error:
            "Failed to load savings.",
        },
        { status: 500 }
      );
    }

    const rows =
      (savings ?? []) as SavingRow[];

    const userIds = Array.from(
      new Set(
        rows
          .map(
            (saving) =>
              saving.user_id
          )
          .filter(Boolean)
      )
    );

    const spaceIds = Array.from(
      new Set(
        rows
          .map(
            (saving) =>
              saving.space_id
          )
          .filter(Boolean)
      )
    );

    const [
      profilesResult,
      spacesResult,
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
    ]);

    if (
      profilesResult.error ||
      spacesResult.error
    ) {
      console.error(
        "Super Admin savings relation lookup error:",
        profilesResult.error ??
          spacesResult.error
      );

      return NextResponse.json(
        {
          error:
            "Failed to load saving details.",
        },
        { status: 500 }
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

    const normalizedSearch =
      search.toLowerCase();

    const filteredRows =
      normalizedSearch
        ? rows.filter(
            (saving) => {
              const targetUser =
                profilesById.get(
                  saving.user_id
                );

              const space =
                spacesById.get(
                  saving.space_id
                );

              const searchableText =
                [
                  saving.name,
                  saving.target_amount,
                  saving.current_amount,
                  saving.deadline,
                  targetUser?.full_name,
                  targetUser?.username,
                  targetUser?.email,
                  space?.name,
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

    // -----------------------------------------------
    // Load ALL users and ALL spaces for Admin forms
    // -----------------------------------------------

    const [
      allUsersResult,
      allSpacesResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, username, email, role"
        )
        .order(
          "created_at",
          { ascending: false }
        ),

      supabaseAdmin
        .from("spaces")
        .select(
          "id, name, type, base_currency, owner_id"
        )
        .order(
          "created_at",
          { ascending: false }
        ),
    ]);

    if (
      allUsersResult.error ||
      allSpacesResult.error
    ) {
      console.error(
        "Super Admin savings options lookup error:",
        allUsersResult.error ??
          allSpacesResult.error
      );

      return NextResponse.json(
        {
          error:
            "Failed to load saving options.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,

      savings:
        filteredRows.map(
          (saving) => {
            const targetAmount =
              Number(
                saving.target_amount ?? 0
              );

            const currentAmount =
              Number(
                saving.current_amount ?? 0
              );

            const remaining =
              targetAmount -
              currentAmount;

            const progress =
              targetAmount > 0
                ? Math.min(
                    100,
                    Math.max(
                      0,
                      (currentAmount /
                        targetAmount) *
                        100
                    )
                  )
                : 0;

            return {
              ...saving,

              user:
                profilesById.get(
                  saving.user_id
                ) ?? null,

              space:
                spacesById.get(
                  saving.space_id
                ) ?? null,

              remaining,
              progress,
            };
          }
        ),

      total:
        filteredRows.length,

      limited:
        rows.length >= 500,

      options: {
        users:
          allUsersResult.data ??
          [],
        spaces:
          allSpacesResult.data ??
          [],
      },
    });
  } catch (error) {
    console.error(
      "Super Admin savings GET API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error.",
      },
      { status: 500 }
    );
  }
}

// ==================================================
// POST - Create saving
// ==================================================

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

    let body: SavingBody;

    try {
      body =
        (await request.json()) as SavingBody;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON body.",
        },
        { status: 400 }
      );
    }

    const userId =
      body.user_id?.trim();

    const spaceId =
      body.space_id?.trim();

    const name =
      body.name?.trim();

    const targetAmount =
      Number(body.target_amount);

    const currentAmount =
      Number(
        body.current_amount ?? 0
      );

    const deadline =
      body.deadline?.trim();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "User ID is required.",
        },
        { status: 400 }
      );
    }

    if (!spaceId) {
      return NextResponse.json(
        {
          error:
            "Space ID is required.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Saving goal name is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(
        targetAmount
      ) ||
      targetAmount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Target amount must be a positive number.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(
        currentAmount
      ) ||
      currentAmount < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Current amount must be a valid non-negative number.",
        },
        { status: 400 }
      );
    }

    if (
      currentAmount >
      targetAmount
    ) {
      return NextResponse.json(
        {
          error:
            "Current amount cannot exceed target amount.",
        },
        { status: 400 }
      );
    }

    if (
      !deadline ||
      !isValidDate(deadline)
    ) {
      return NextResponse.json(
        {
          error:
            "Valid deadline is required.",
        },
        { status: 400 }
      );
    }

    const relations =
      await validateUserAndSpace(
        userId,
        spaceId
      );

    if (
      relations.errorResponse
    ) {
      return relations.errorResponse;
    }

    const {
      data: createdSaving,
      error: createError,
    } = await supabaseAdmin
      .from("savings")
      .insert({
        user_id:
          userId,
        space_id:
          spaceId,
        name,
        target_amount:
          targetAmount,
        current_amount:
          currentAmount,
        deadline,
      })
      .select("*")
      .single();

    if (
      createError ||
      !createdSaving
    ) {
      console.error(
        "Super Admin saving create error:",
        createError
      );

      return NextResponse.json(
        {
          error:
            "Failed to create saving goal.",
        },
        { status: 500 }
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
          "SAVING_CREATE",
        entity_type:
          "saving",
        entity_id:
          createdSaving.id,
        details: {
          new_values:
            createdSaving,
        },
      });

    if (auditError) {
      console.error(
        "Saving create audit log error:",
        auditError
      );
    }

    return NextResponse.json(
      {
        success: true,
        saving:
          createdSaving,
        message:
          "Saving goal created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Super Admin savings POST API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error.",
      },
      { status: 500 }
    );
  }
}

// ==================================================
// PATCH - Update saving
// ==================================================

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

    let body: SavingBody & {
      id?: string;
    };

    try {
      body =
        (await request.json()) as SavingBody & {
          id?: string;
        };
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON body.",
        },
        { status: 400 }
      );
    }

    const id =
      body.id?.trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Saving goal ID is required.",
        },
        { status: 400 }
      );
    }

    const {
      data: currentSaving,
      error: currentSavingError,
    } = await supabaseAdmin
      .from("savings")
      .select("*")
      .eq("id", id)
      .single();

    if (
      currentSavingError ||
      !currentSaving
    ) {
      console.error(
        "Current saving lookup error:",
        currentSavingError
      );

      return NextResponse.json(
        {
          error:
            "Saving goal not found.",
        },
        { status: 404 }
      );
    }

    const nextUserId =
      body.user_id !== undefined
        ? body.user_id.trim()
        : currentSaving.user_id;

    const nextSpaceId =
      body.space_id !== undefined
        ? body.space_id.trim()
        : currentSaving.space_id;

    const nextName =
      body.name !== undefined
        ? body.name.trim()
        : currentSaving.name;

    const nextTargetAmount =
      body.target_amount !==
      undefined
        ? Number(
            body.target_amount
          )
        : Number(
            currentSaving.target_amount
          );

    const nextCurrentAmount =
      body.current_amount !==
      undefined
        ? Number(
            body.current_amount
          )
        : Number(
            currentSaving.current_amount
          );

    const nextDeadline =
      body.deadline !== undefined
        ? body.deadline.trim()
        : currentSaving.deadline;

    if (!nextUserId) {
      return NextResponse.json(
        {
          error:
            "User ID is required.",
        },
        { status: 400 }
      );
    }

    if (!nextSpaceId) {
      return NextResponse.json(
        {
          error:
            "Space ID is required.",
        },
        { status: 400 }
      );
    }

    if (!nextName) {
      return NextResponse.json(
        {
          error:
            "Saving goal name is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(
        nextTargetAmount
      ) ||
      nextTargetAmount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Target amount must be a positive number.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(
        nextCurrentAmount
      ) ||
      nextCurrentAmount < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Current amount must be a valid non-negative number.",
        },
        { status: 400 }
      );
    }

    if (
      nextCurrentAmount >
      nextTargetAmount
    ) {
      return NextResponse.json(
        {
          error:
            "Current amount cannot exceed target amount.",
        },
        { status: 400 }
      );
    }

    if (
      !isValidDate(
        nextDeadline
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Valid deadline is required.",
        },
        { status: 400 }
      );
    }

    const relations =
      await validateUserAndSpace(
        nextUserId,
        nextSpaceId
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
      name:
        nextName,
      target_amount:
        nextTargetAmount,
      current_amount:
        nextCurrentAmount,
      deadline:
        nextDeadline,
    };

    const {
      data: updatedSaving,
      error: updateError,
    } = await supabaseAdmin
      .from("savings")
      .update(
        updatedValues
      )
      .eq("id", id)
      .select("*")
      .single();

    if (
      updateError ||
      !updatedSaving
    ) {
      console.error(
        "Super Admin saving update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Failed to update saving goal.",
        },
        { status: 500 }
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
          "SAVING_UPDATE",
        entity_type:
          "saving",
        entity_id:
          id,
        details: {
          old_values:
            currentSaving,
          new_values:
            updatedSaving,
        },
      });

    if (auditError) {
      console.error(
        "Saving update audit log error:",
        auditError
      );
    }

    return NextResponse.json({
      success: true,
      saving:
        updatedSaving,
      message:
        "Saving goal updated successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin savings PATCH API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error.",
      },
      { status: 500 }
    );
  }
}

// ==================================================
// DELETE - Delete saving
// ==================================================

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
    } = {};

    try {
      body =
        (await request.json()) as {
          id?: string;
        };
    } catch {
      // ID can be supplied using query string.
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
            "Saving goal ID is required.",
        },
        { status: 400 }
      );
    }

    const {
      data: currentSaving,
      error: currentSavingError,
    } = await supabaseAdmin
      .from("savings")
      .select("*")
      .eq("id", id)
      .single();

    if (
      currentSavingError ||
      !currentSaving
    ) {
      return NextResponse.json(
        {
          error:
            "Saving goal not found.",
        },
        { status: 404 }
      );
    }

    const {
      error: deleteError,
    } = await supabaseAdmin
      .from("savings")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "Super Admin saving delete error:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "Failed to delete saving goal.",
        },
        { status: 500 }
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
          "SAVING_DELETE",
        entity_type:
          "saving",
        entity_id:
          id,
        details: {
          old_values:
            currentSaving,
        },
      });

    if (auditError) {
      console.error(
        "Saving delete audit log error:",
        auditError
      );
    }

    return NextResponse.json({
      success: true,
      deletedSavingId:
        id,
      message:
        "Saving goal deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin savings DELETE API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error.",
      },
      { status: 500 }
    );
  }
}