import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidCurrencyCode } from "@/lib/currency";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateSpaceBody = {
  name?: string;
  type?: string;
  owner_id?: string | null;
  base_currency?: string;
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

  return {
    user,
    errorResponse: null,
  };
}

function cleanText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

async function getSpace(id: string) {
  return await supabaseAdmin
    .from("spaces")
    .select(
      "id, name, type, owner_id, base_currency, created_at"
    )
    .eq("id", id)
    .maybeSingle();
}

// GET DETAILS
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Space ID is required" },
        { status: 400 }
      );
    }

    const { user, errorResponse } =
      await requireSuperAdmin();

    if (errorResponse || !user) {
      return (
        errorResponse ??
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    const [
      { data: space, error: spaceError },
      { data: members, error: membersError },
      { data: profiles, error: profilesError },
      { data: accounts, error: accountsError },
      { data: categories, error: categoriesError },
    ] = await Promise.all([
      getSpace(id),

      supabaseAdmin
        .from("space_members")
        .select(
          "space_id, user_id, role, created_at"
        )
        .eq("space_id", id)
        .order("created_at", {
          ascending: true,
        }),

      supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, username, email, role"
        ),

      supabaseAdmin
        .from("accounts")
        .select(
          "id, name, type, currency, opening_balance, description, is_archived, created_by, created_at"
        )
        .eq("space_id", id)
        .order("created_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from("categories")
        .select(
          "id, name, kind, icon, is_system"
        )
        .eq("space_id", id)
        .order("name"),
    ]);

    if (spaceError || !space) {
      return NextResponse.json(
        { error: "Space not found" },
        { status: 404 }
      );
    }

    if (membersError) {
      return NextResponse.json(
        {
          error: "Failed to load space members",
          details: membersError.message,
          code: membersError.code,
        },
        { status: 500 }
      );
    }

    if (profilesError) {
      return NextResponse.json(
        {
          error: "Failed to load space users",
          details: profilesError.message,
          code: profilesError.code,
        },
        { status: 500 }
      );
    }

    if (accountsError) {
      return NextResponse.json(
        {
          error: "Failed to load space accounts",
          details: accountsError.message,
          code: accountsError.code,
        },
        { status: 500 }
      );
    }

    if (categoriesError) {
      return NextResponse.json(
        {
          error: "Failed to load space categories",
          details: categoriesError.message,
          code: categoriesError.code,
        },
        { status: 500 }
      );
    }

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        profile,
      ])
    );

    const owner = space.owner_id
      ? profileMap.get(space.owner_id)
      : null;

    return NextResponse.json({
      success: true,
      space: {
        ...space,
        owner: owner
          ? {
              id: owner.id,
              name:
                owner.full_name ||
                owner.username ||
                owner.email ||
                "Unknown User",
              username: owner.username,
              email: owner.email,
            }
          : null,
        members: (members ?? []).map(
          (member) => {
            const memberUser =
              profileMap.get(member.user_id);

            return {
              user_id: member.user_id,
              role: member.role,
              created_at: member.created_at,
              user: memberUser
                ? {
                    id: memberUser.id,
                    name:
                      memberUser.full_name ||
                      memberUser.username ||
                      memberUser.email ||
                      "Unknown User",
                    username:
                      memberUser.username,
                    email: memberUser.email,
                  }
                : null,
            };
          }
        ),
        accounts: (accounts ?? []).map(
          (account) => {
            const accountOwner =
              account.created_by
                ? profileMap.get(
                    account.created_by
                  )
                : null;

            return {
              ...account,
              owner: accountOwner
                ? {
                    id: accountOwner.id,
                    name:
                      accountOwner.full_name ||
                      accountOwner.username ||
                      accountOwner.email ||
                      "Unknown User",
                    username:
                      accountOwner.username,
                    email: accountOwner.email,
                  }
                : null,
            };
          }
        ),
        categories:
          categories ?? [],
      },
    });
  } catch (error) {
    console.error(
      "Super Admin space GET API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

// PATCH
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Space ID is required" },
        { status: 400 }
      );
    }

    const { user: actor, errorResponse } =
      await requireSuperAdmin();

    if (errorResponse || !actor) {
      return (
        errorResponse ??
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    let body: UpdateSpaceBody;

    try {
      body =
        (await request.json()) as UpdateSpaceBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { data: currentSpace, error: currentError } =
      await getSpace(id);

    if (currentError) {
      return NextResponse.json(
        {
          error: "Failed to load space",
          details: currentError.message,
          code: currentError.code,
        },
        { status: 500 }
      );
    }

    if (!currentSpace) {
      return NextResponse.json(
        { error: "Space not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = cleanText(body.name);

      if (!name) {
        return NextResponse.json(
          { error: "Space name is invalid" },
          { status: 400 }
        );
      }

      updateData.name = name;
    }

    if (body.type !== undefined) {
      const type = cleanText(body.type);

      if (!type) {
        return NextResponse.json(
          { error: "Space type is invalid" },
          { status: 400 }
        );
      }

      updateData.type = type;
    }

    if (body.base_currency !== undefined) {
      const currency =
        cleanText(body.base_currency).toUpperCase();

      if (!isValidCurrencyCode(currency)) {
        return NextResponse.json(
          {
            error: "Base currency must be a three-letter code",
          },
          { status: 400 }
        );
      }

      updateData.base_currency = currency;
    }

    let ownerChanged = false;
    let newlyAddedOwnerMembership = false;
    const previousOwnerId =
      currentSpace.owner_id;

    if (body.owner_id !== undefined) {
      const newOwnerId =
        body.owner_id === null
          ? null
          : cleanText(body.owner_id) || null;

      if (newOwnerId) {
        const {
          data: newOwner,
          error: newOwnerError,
        } = await supabaseAdmin
          .from("profiles")
          .select(
            "id, full_name, username, email, role"
          )
          .eq("id", newOwnerId)
          .maybeSingle();

        if (newOwnerError) {
          return NextResponse.json(
            {
              error:
                "Failed to verify the new owner",
              details:
                newOwnerError.message,
              code:
                newOwnerError.code,
            },
            { status: 500 }
          );
        }

        if (!newOwner) {
          return NextResponse.json(
            {
              error:
                "Selected owner does not exist",
            },
            { status: 404 }
          );
        }

        const {
          data: membership,
          error: membershipLookupError,
        } = await supabaseAdmin
          .from("space_members")
          .select(
            "space_id, user_id, role"
          )
          .eq("space_id", id)
          .eq("user_id", newOwnerId)
          .maybeSingle();

        if (membershipLookupError) {
          return NextResponse.json(
            {
              error:
                "Failed to verify owner membership",
              details:
                membershipLookupError.message,
              code:
                membershipLookupError.code,
            },
            { status: 500 }
          );
        }

        if (!membership) {
          const {
            error: membershipInsertError,
          } = await supabaseAdmin
            .from("space_members")
            .insert({
              space_id: id,
              user_id: newOwnerId,
              role: "admin",
            });

          if (membershipInsertError) {
            return NextResponse.json(
              {
                error:
                  "Failed to add the new owner to the space",
                details:
                  membershipInsertError.message,
                code:
                  membershipInsertError.code,
              },
              { status: 500 }
            );
          }

          newlyAddedOwnerMembership = true;
        }
      }

      if (
        currentSpace.owner_id !==
        newOwnerId
      ) {
        updateData.owner_id = newOwnerId;
        ownerChanged = true;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error:
            "No space fields were provided for update",
        },
        { status: 400 }
      );
    }

    const {
      data: updatedSpace,
      error: updateError,
    } = await supabaseAdmin
      .from("spaces")
      .update(updateData)
      .eq("id", id)
      .select(
        "id, name, type, owner_id, base_currency, created_at"
      )
      .single();

    if (updateError || !updatedSpace) {
      console.error(
        "Super Admin space update error:",
        updateError
      );

      if (
        newlyAddedOwnerMembership
      ) {
        await supabaseAdmin
          .from("space_members")
          .delete()
          .eq("space_id", id)
          .eq("user_id", updateData.owner_id as string);
      }

      return NextResponse.json(
        {
          error: "Failed to update space",
          details:
            updateError?.message ??
            "Unknown database error",
          code: updateError?.code ?? null,
          hint: updateError?.hint ?? null,
        },
        { status: 500 }
      );
    }

    if (ownerChanged) {
      const { data: oldOwner } =
        previousOwnerId
          ? await supabaseAdmin
              .from("profiles")
              .select(
                "id, full_name, username, email"
              )
              .eq(
                "id",
                previousOwnerId
              )
              .maybeSingle()
          : { data: null };

      const { data: newOwner } =
        updatedSpace.owner_id
          ? await supabaseAdmin
              .from("profiles")
              .select(
                "id, full_name, username, email"
              )
              .eq(
                "id",
                updatedSpace.owner_id
              )
              .maybeSingle()
          : { data: null };

      const { error: auditError } =
        await supabaseAdmin
          .from("audit_logs")
          .insert({
            actor_id: actor.id,
            space_id: id,
            action:
              "SPACE_OWNER_CHANGE",
            entity_type: "space",
            entity_id: id,
            details: {
              old_owner_id:
                previousOwnerId,
              old_owner_name:
                oldOwner?.full_name ??
                oldOwner?.username ??
                oldOwner?.email ??
                null,
              new_owner_id:
                updatedSpace.owner_id,
              new_owner_name:
                newOwner?.full_name ??
                newOwner?.username ??
                newOwner?.email ??
                null,
              membership_added:
                newlyAddedOwnerMembership,
            },
          });

      if (auditError) {
        console.error(
          "Space owner audit log error:",
          auditError
        );
      }
    }

    const { error: auditUpdateError } =
      await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: actor.id,
          space_id: id,
          action: "SPACE_UPDATE",
          entity_type: "space",
          entity_id: id,
          details: {
            old_values: currentSpace,
            new_values: updatedSpace,
          },
        });

    if (auditUpdateError) {
      console.error(
        "Space update audit log error:",
        auditUpdateError
      );
    }

    return NextResponse.json({
      success: true,
      space: updatedSpace,
      message: "Space updated successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin space PATCH API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE
export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Space ID is required" },
        { status: 400 }
      );
    }

    const { user: actor, errorResponse } =
      await requireSuperAdmin();

    if (errorResponse || !actor) {
      return (
        errorResponse ??
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    // Load the space before deleting anything.
    const { data: space, error: spaceError } =
      await getSpace(id);

    if (spaceError) {
      console.error(
        "Space delete lookup error:",
        spaceError
      );

      return NextResponse.json(
        {
          error: "Failed to load space",
          details: spaceError.message,
          code: spaceError.code,
        },
        { status: 500 }
      );
    }

    if (!space) {
      return NextResponse.json(
        { error: "Space not found" },
        { status: 404 }
      );
    }

    // Full-control Super Admin delete:
    // remove dependent data first, then the space itself.
    //
    // Order matters because the related tables can contain
    // foreign keys pointing back to the space or to each other.
    const deleteStep = async (
      table:
        | "transactions"
        | "budgets"
        | "savings"
        | "categories"
        | "accounts"
        | "space_members"
    ) => {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("space_id", id);

      if (error) {
        console.error(
          `Space delete failed for ${table}:`,
          error
        );

        throw new Error(
          `${table}: ${error.message}`
        );
      }
    };

    try {
      // Transactions first: they may reference accounts/categories.
      await deleteStep("transactions");

      // Then data that may reference categories/accounts.
      await deleteStep("budgets");
      await deleteStep("savings");
      await deleteStep("categories");
      await deleteStep("accounts");

      // Memberships must be removed before deleting the space.
      await deleteStep("space_members");
    } catch (error) {
      return NextResponse.json(
        {
          error: "Failed to remove related space data",
          details:
            error instanceof Error
              ? error.message
              : String(error),
          message:
            "The space was NOT deleted. Fix the reported dependency/database constraint and try again.",
        },
        { status: 409 }
      );
    }

    // Delete the space itself only after all dependents are gone.
    const { error: deleteError } =
      await supabaseAdmin
        .from("spaces")
        .delete()
        .eq("id", id);

    if (deleteError) {
      console.error(
        "Super Admin space delete error:",
        deleteError
      );

      return NextResponse.json(
        {
          error: "Failed to delete space",
          details: deleteError.message,
          code: deleteError.code,
          hint: deleteError.hint ?? null,
        },
        { status: 409 }
      );
    }

    // Keep the audit record even after the space is gone.
    // Do NOT send space_id here in case audit_logs.space_id
    // has a foreign-key constraint to spaces.
    const { error: auditError } =
      await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: actor.id,
          action: "SPACE_DELETE",
          entity_type: "space",
          entity_id: id,
          details: {
            old_values: space,
            cascade_delete: true,
          },
        });

    if (auditError) {
      console.error(
        "Space delete audit log error:",
        auditError
      );
    }

    return NextResponse.json({
      success: true,
      deletedSpaceId: id,
      message:
        "Space and all related data deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin space DELETE API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}
