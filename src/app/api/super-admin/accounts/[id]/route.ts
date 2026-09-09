import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidCurrencyCode } from "@/lib/currency";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateAccountBody = {
  name?: string;
  type?: string;
  currency?: string;
  opening_balance?: number;
  description?: string | null;
  is_archived?: boolean;
  owner_id?: string | null;
};

async function requireSuperAdmin() {
  // --------------------------------------------------
  // Authenticate current browser session
  // --------------------------------------------------

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

  // --------------------------------------------------
  // Verify Super Admin using service-role access.
  // --------------------------------------------------

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
      "Super Admin profile check error:",
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

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Account ID is required",
        },
        {
          status: 400,
        }
      );
    }

    const {
      user,
      errorResponse,
    } = await requireSuperAdmin();

    if (errorResponse || !user) {
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

    // --------------------------------------------------
    // Parse body
    // --------------------------------------------------

    let body: UpdateAccountBody;

    try {
      body =
        (await request.json()) as UpdateAccountBody;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON body",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // Get current account
    // --------------------------------------------------

    const {
      data: currentAccount,
      error: currentAccountError,
    } = await supabaseAdmin
      .from("accounts")
      .select(
        `
          id,
          name,
          type,
          currency,
          opening_balance,
          description,
          is_archived,
          created_by,
          space_id
        `
      )
      .eq("id", id)
      .single();

    if (
      currentAccountError ||
      !currentAccount
    ) {
      console.error(
        "Current account lookup error:",
        currentAccountError
      );

      return NextResponse.json(
        {
          error: "Account not found",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------
    // Prepare updates
    // --------------------------------------------------

    const updateData: Record<
      string,
      unknown
    > = {};

    if (body.name !== undefined) {
      if (
        typeof body.name !== "string" ||
        body.name.trim().length === 0
      ) {
        return NextResponse.json(
          {
            error: "Account name is invalid",
          },
          {
            status: 400,
          }
        );
      }

      updateData.name =
        body.name.trim();
    }

    if (body.type !== undefined) {
      if (
        typeof body.type !== "string" ||
        body.type.trim().length === 0
      ) {
        return NextResponse.json(
          {
            error: "Account type is invalid",
          },
          {
            status: 400,
          }
        );
      }

      updateData.type =
        body.type.trim();
    }

    if (body.currency !== undefined) {
      if (
        typeof body.currency !== "string" ||
        !isValidCurrencyCode(body.currency)
      ) {
        return NextResponse.json(
          {
            error: "Currency must be a three-letter code.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.currency =
        body.currency
          .trim()
          .toUpperCase();
    }

    if (
      body.opening_balance !==
      undefined
    ) {
      const balance = Number(
        body.opening_balance
      );

      if (!Number.isFinite(balance)) {
        return NextResponse.json(
          {
            error:
              "Opening balance must be a valid number",
          },
          {
            status: 400,
          }
        );
      }

      updateData.opening_balance =
        balance;
    }

    if (
      body.description !==
      undefined
    ) {
      updateData.description =
        body.description;
    }

    if (
      body.is_archived !==
      undefined
    ) {
      if (
        typeof body.is_archived !==
        "boolean"
      ) {
        return NextResponse.json(
          {
            error:
              "Archive status must be boolean",
          },
          {
            status: 400,
          }
        );
      }

      updateData.is_archived =
        body.is_archived;
    }

    // --------------------------------------------------
    // Change Owner
    // --------------------------------------------------

    let ownerChanged = false;
    let newlyAddedSpaceMember = false;

    const previousOwnerId =
      currentAccount.created_by;

    if (body.owner_id !== undefined) {
      const newOwnerId =
        body.owner_id;

      // ----------------------------------------------
      // Remove owner
      // ----------------------------------------------

      if (newOwnerId === null) {
        if (
          currentAccount.created_by !==
          null
        ) {
          updateData.created_by = null;
          ownerChanged = true;
        }
      } else {
        // --------------------------------------------
        // Validate owner ID
        // --------------------------------------------

        if (
          typeof newOwnerId !==
            "string" ||
          newOwnerId.trim().length === 0
        ) {
          return NextResponse.json(
            {
              error: "Owner ID is invalid",
            },
            {
              status: 400,
            }
          );
        }

        // --------------------------------------------
        // Verify selected owner exists
        // --------------------------------------------

        const {
          data: newOwner,
          error: newOwnerError,
        } = await supabaseAdmin
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
          .eq(
            "id",
            newOwnerId
          )
          .single();

        if (
          newOwnerError ||
          !newOwner
        ) {
          return NextResponse.json(
            {
              error:
                "The selected owner does not exist.",
            },
            {
              status: 404,
            }
          );
        }

        // --------------------------------------------
        // Change created_by when needed
        // --------------------------------------------

        if (
          currentAccount.created_by !==
          newOwnerId
        ) {
          updateData.created_by =
            newOwnerId;

          ownerChanged = true;
        }

        // --------------------------------------------
        // Make sure new owner belongs to this Space
        // --------------------------------------------

        const {
          data: existingMembership,
          error:
            membershipLookupError,
        } = await supabaseAdmin
          .from("space_members")
          .select(
            "space_id, user_id, role"
          )
          .eq(
            "space_id",
            currentAccount.space_id
          )
          .eq(
            "user_id",
            newOwnerId
          )
          .maybeSingle();

        if (membershipLookupError) {
          console.error(
            "Space membership lookup error:",
            membershipLookupError
          );

          return NextResponse.json(
            {
              error:
                "Failed to verify the selected owner's space access.",
            },
            {
              status: 500,
            }
          );
        }

        if (!existingMembership) {
          const {
            error:
              membershipInsertError,
          } = await supabaseAdmin
            .from("space_members")
            .insert({
              space_id:
                currentAccount.space_id,
              user_id:
                newOwnerId,
              role: "member",
            });

          if (membershipInsertError) {
            console.error(
              "Space membership insert error:",
              membershipInsertError
            );

            return NextResponse.json(
              {
                error:
                  "Failed to grant the new owner access to the account space.",
              },
              {
                status: 500,
              }
            );
          }

          newlyAddedSpaceMember =
            true;
        }
      }
    }

    // --------------------------------------------------
    // Ensure something changed
    // --------------------------------------------------

    if (
      Object.keys(updateData).length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "No account fields were provided for update",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // Update account
    // --------------------------------------------------

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("accounts")
      .update({
        ...updateData,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    // --------------------------------------------------
    // Roll back membership if account update fails
    // --------------------------------------------------

    if (error) {
      console.error(
        "Account update error:",
        error
      );

      if (
        newlyAddedSpaceMember &&
        body.owner_id
      ) {
        const {
          error:
            membershipRollbackError,
        } = await supabaseAdmin
          .from("space_members")
          .delete()
          .eq(
            "space_id",
            currentAccount.space_id
          )
          .eq(
            "user_id",
            body.owner_id
          );

        if (
          membershipRollbackError
        ) {
          console.error(
            "Space membership rollback error:",
            membershipRollbackError
          );
        }
      }

      return NextResponse.json(
        {
          error:
            "Failed to update account",
        },
        {
          status: 500,
        }
      );
    }

    // --------------------------------------------------
    // Audit owner change
    // --------------------------------------------------

    if (ownerChanged) {
      const {
        data: previousOwner,
      } = previousOwnerId
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
        : {
            data: null,
          };

      const {
        data: newOwner,
      } = data.created_by
        ? await supabaseAdmin
            .from("profiles")
            .select(
              "id, full_name, username, email"
            )
            .eq(
              "id",
              data.created_by
            )
            .maybeSingle()
        : {
            data: null,
          };

      const {
        error: auditError,
      } = await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: user.id,
          action:
            "ACCOUNT_OWNER_CHANGE",
          entity_type: "account",
          entity_id: id,
          details: {
            account_name:
              currentAccount.name,
            old_owner_id:
              previousOwnerId,
            old_owner_name:
              previousOwner?.full_name ??
              previousOwner?.username ??
              previousOwner?.email ??
              null,
            new_owner_id:
              data.created_by,
            new_owner_name:
              newOwner?.full_name ??
              newOwner?.username ??
              newOwner?.email ??
              null,
            space_id:
              currentAccount.space_id,
            space_member_added:
              newlyAddedSpaceMember,
          },
        });

      if (auditError) {
        console.error(
          "Account owner audit log error:",
          auditError
        );
      }
    }

    return NextResponse.json({
      success: true,
      account: data,
      message: ownerChanged
        ? "Account owner updated successfully."
        : "Account updated successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin account PATCH error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Account ID is required",
        },
        {
          status: 400,
        }
      );
    }

    const {
      user,
      errorResponse,
    } = await requireSuperAdmin();

    if (errorResponse || !user) {
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

    // --------------------------------------------------
    // Get account
    // --------------------------------------------------

    const {
      data: account,
      error: accountError,
    } = await supabaseAdmin
      .from("accounts")
      .select(
        `
          id,
          name,
          space_id,
          created_by,
          is_archived
        `
      )
      .eq("id", id)
      .single();

    if (
      accountError ||
      !account
    ) {
      return NextResponse.json(
        {
          error:
            "Account not found",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------
    // Protect default Cash Wallet
    // --------------------------------------------------

    if (
      account.name
        .trim()
        .toLowerCase() ===
      "cash wallet"
    ) {
      return NextResponse.json(
        {
          error:
            "The default Cash Wallet cannot be permanently deleted. Archive it instead.",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------
    // Check transactions
    // --------------------------------------------------

    const {
      count: transactionCount,
      error:
        transactionCheckError,
    } = await supabaseAdmin
      .from("transactions")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "account_id",
        id
      );

    if (transactionCheckError) {
      console.error(
        "Transaction check error:",
        transactionCheckError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify whether this account has transactions.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      (transactionCount ?? 0) > 0
    ) {
      return NextResponse.json(
        {
          error:
            "This account cannot be deleted because it has transactions. Archive it instead.",
          transactionCount,
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------
    // Delete account
    // --------------------------------------------------

    const {
      error: deleteError,
    } = await supabaseAdmin
      .from("accounts")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "Account delete error:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "Failed to delete account",
        },
        {
          status: 500,
        }
      );
    }

    // --------------------------------------------------
    // Audit deletion
    // --------------------------------------------------

    const {
      error: auditError,
    } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        actor_id: user.id,
        action: "ACCOUNT_DELETE",
        entity_type: "account",
        entity_id: id,
        details: {
          account_name:
            account.name,
          owner_id:
            account.created_by,
          space_id:
            account.space_id,
        },
      });

    if (auditError) {
      console.error(
        "Account delete audit log error:",
        auditError
      );
    }

    return NextResponse.json({
      success: true,
      deletedAccountId:
        account.id,
    });
  } catch (error) {
    console.error(
      "Super Admin account DELETE error:",
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