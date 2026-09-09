import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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
      "Super Admin category dynamic route profile check error:",
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

const KIND_MAP: Record<string, string> = {
  income: "income",
  expense: "expense",
  transfer: "transfer",

  "دخل": "income",
  "إيراد": "income",
  "ايراد": "income",

  "مصروف": "expense",
  "مصروفات": "expense",
  "نفقات": "expense",

  "تحويل": "transfer",
  "تحويلات": "transfer",
};

function normalizeKind(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const raw = String(value).trim();

  if (!raw) {
    return "";
  }

  return (
    KIND_MAP[raw.toLowerCase()] ??
    raw.toLowerCase()
  );
}

function cleanNullableText(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text = String(value).trim();

  return text ? text : null;
}

// ==================================================
// PATCH
// ==================================================

export async function PATCH(
  request: Request,
  { params }: RouteContext
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

    const { id } = await params;

    if (!id) {
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

    let body: {
      space_id?: string;
      name?: string;
      kind?: string;
      icon?: string | null;
      is_system?: boolean;
    };

    try {
      body =
        (await request.json()) as {
          space_id?: string;
          name?: string;
          kind?: string;
          icon?: string | null;
          is_system?: boolean;
        };
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON body.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: currentCategory,
      error: lookupError,
    } = await supabaseAdmin
      .from("categories")
      .select(
        `
          id,
          space_id,
          name,
          kind,
          icon,
          is_system,
          created_at
        `
      )
      .eq("id", id)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json(
        {
          error:
            "Failed to load category.",
          details: lookupError.message,
          code: lookupError.code,
          hint: lookupError.hint ?? null,
        },
        {
          status: 500,
        }
      );
    }

    if (!currentCategory) {
      return NextResponse.json(
        {
          error:
            "Category not found.",
        },
        {
          status: 404,
        }
      );
    }

    const nextSpaceId =
      body.space_id !== undefined
        ? cleanNullableText(
            body.space_id
          )
        : currentCategory.space_id;

    const nextName =
      body.name !== undefined
        ? cleanNullableText(
            body.name
          )
        : currentCategory.name;

    const nextKind =
      body.kind !== undefined
        ? normalizeKind(
            body.kind
          )
        : currentCategory.kind;

    const nextIcon =
      body.icon !== undefined
        ? cleanNullableText(
            body.icon
          )
        : currentCategory.icon;

    const nextIsSystem =
      body.is_system !== undefined
        ? Boolean(
            body.is_system
          )
        : Boolean(
            currentCategory.is_system
          );

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

    if (!nextName) {
      return NextResponse.json(
        {
          error:
            "Category name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!nextKind) {
      return NextResponse.json(
        {
          error:
            "Category kind is required.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: targetSpace,
      error: targetSpaceError,
    } = await supabaseAdmin
      .from("spaces")
      .select(
        "id, name, type, base_currency"
      )
      .eq("id", nextSpaceId)
      .maybeSingle();

    if (targetSpaceError) {
      return NextResponse.json(
        {
          error:
            "Failed to verify space.",
          details:
            targetSpaceError.message,
          code:
            targetSpaceError.code,
        },
        {
          status: 500,
        }
      );
    }

    if (!targetSpace) {
      return NextResponse.json(
        {
          error:
            "Space not found.",
        },
        {
          status: 404,
        }
      );
    }

    const updatedValues = {
      space_id:
        nextSpaceId,
      name:
        nextName,
      kind:
        nextKind,
      icon:
        nextIcon,
      is_system:
        nextIsSystem,
    };

    const {
      data: updatedCategory,
      error: updateError,
    } = await supabaseAdmin
      .from("categories")
      .update(
        updatedValues
      )
      .eq("id", id)
      .select(
        `
          id,
          space_id,
          name,
          kind,
          icon,
          is_system,
          created_at
        `
      )
      .single();

    if (
      updateError ||
      !updatedCategory
    ) {
      console.error(
        "Super Admin category dynamic update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Failed to update category.",
          details:
            updateError?.message ??
            "Unknown database error.",
          code:
            updateError?.code ??
            null,
          hint:
            updateError?.hint ??
            null,
        },
        {
          status:
            updateError?.code ===
            "23505"
              ? 409
              : 500,
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
        space_id:
          nextSpaceId,
        action:
          "CATEGORY_UPDATE",
        entity_type:
          "category",
        entity_id:
          id,
        details: {
          old_values:
            currentCategory,
          new_values:
            updatedCategory,
        },
      });

    if (auditError) {
      console.error(
        "Category dynamic update audit log error:",
        auditError
      );
    }

    return NextResponse.json({
      success: true,
      category: {
        ...updatedCategory,
        space: targetSpace,
      },
      message:
        "Category updated successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin category PATCH API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}

// ==================================================
// DELETE
// ==================================================

export async function DELETE(
  _request: Request,
  { params }: RouteContext
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

    const { id } = await params;

    if (!id) {
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

    const {
      data: currentCategory,
      error: lookupError,
    } = await supabaseAdmin
      .from("categories")
      .select(
        `
          id,
          space_id,
          name,
          kind,
          icon,
          is_system,
          created_at
        `
      )
      .eq("id", id)
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Super Admin category dynamic delete lookup error:",
        lookupError
      );

      return NextResponse.json(
        {
          error:
            "Failed to load category.",
          details:
            lookupError.message,
          code:
            lookupError.code,
          hint:
            lookupError.hint ?? null,
        },
        {
          status: 500,
        }
      );
    }

    if (!currentCategory) {
      return NextResponse.json(
        {
          error:
            "Category not found.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      error: deleteError,
    } = await supabaseAdmin
      .from("categories")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "Super Admin category dynamic delete error:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "Failed to delete category. It may still be referenced by transactions or budgets.",
          details:
            deleteError.message,
          code:
            deleteError.code,
          hint:
            deleteError.hint ?? null,
        },
        {
          status: 409,
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
        space_id:
          currentCategory.space_id,
        action:
          "CATEGORY_DELETE",
        entity_type:
          "category",
        entity_id:
          id,
        details: {
          old_values:
            currentCategory,
        },
      });

    if (auditError) {
      console.error(
        "Category dynamic delete audit log error:",
        auditError
      );
    }

    return NextResponse.json({
      success: true,
      deletedCategoryId:
        id,
      message:
        "Category deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin category DELETE API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}