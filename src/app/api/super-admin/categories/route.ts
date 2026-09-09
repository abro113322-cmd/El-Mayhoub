import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type CategoryBody = {
  id?: string;
  space_id?: string;
  name?: string;
  kind?: string;
  icon?: string | null;
  is_system?: boolean;
};

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
  if (value === null || value === undefined) {
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
      "Super Admin categories profile check error:",
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

async function loadSpace(
  spaceId: string
) {
  return await supabaseAdmin
    .from("spaces")
    .select(
      "id, name, type, base_currency"
    )
    .eq("id", spaceId)
    .maybeSingle();
}

// ==================================================
// GET
// ==================================================

export async function GET(
  request: Request
) {
  try {
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

    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams
        .get("search")
        ?.trim() ?? "";

    const spaceId =
      searchParams
        .get("space_id")
        ?.trim() ?? "";

    const kind =
      searchParams
        .get("kind")
        ?.trim() ?? "";

    let query = supabaseAdmin
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
      .order("name", {
        ascending: true,
      })
      .limit(1000);

    if (spaceId) {
      query = query.eq(
        "space_id",
        spaceId
      );
    }

    if (kind) {
      query = query.eq(
        "kind",
        normalizeKind(kind)
      );
    }

    const {
      data: categories,
      error: categoriesError,
    } = await query;

    if (categoriesError) {
      console.error(
        "Super Admin categories query error:",
        categoriesError
      );

      return NextResponse.json(
        {
          error:
            "Failed to load categories.",
          details:
            categoriesError.message,
          code:
            categoriesError.code,
          hint:
            categoriesError.hint ??
            null,
        },
        {
          status: 500,
        }
      );
    }

    const rows =
      categories ?? [];

    const spaceIds =
      Array.from(
        new Set(
          rows
            .map(
              (category) =>
                category.space_id
            )
            .filter(Boolean)
        )
      );

    const {
      data: spaces,
      error: spacesError,
    } =
      spaceIds.length > 0
        ? await supabaseAdmin
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
        : {
            data: [],
            error: null,
          };

    if (spacesError) {
      console.error(
        "Super Admin categories spaces lookup error:",
        spacesError
      );

      return NextResponse.json(
        {
          error:
            "Failed to load category spaces.",
          details:
            spacesError.message,
          code:
            spacesError.code,
          hint:
            spacesError.hint ??
            null,
        },
        {
          status: 500,
        }
      );
    }

    const spacesById =
      new Map(
        (spaces ?? []).map(
          (space) => [
            space.id,
            space,
          ]
        )
      );

    const normalizedSearch =
      search.toLowerCase();

    const filteredCategories =
      normalizedSearch
        ? rows.filter(
            (category) => {
              const space =
                spacesById.get(
                  category.space_id
                );

              const searchableText =
                [
                  category.name,
                  category.kind,
                  category.icon,
                  space?.name,
                  space?.type,
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

    const {
      data: allSpaces,
      error: allSpacesError,
    } =
      await supabaseAdmin
        .from("spaces")
        .select(
          `
            id,
            name,
            type,
            base_currency
          `
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (allSpacesError) {
      console.error(
        "Super Admin categories options error:",
        allSpacesError
      );

      return NextResponse.json(
        {
          error:
            "Failed to load category options.",
          details:
            allSpacesError.message,
          code:
            allSpacesError.code,
          hint:
            allSpacesError.hint ??
            null,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      categories:
        filteredCategories.map(
          (category) => ({
            ...category,

            space:
              spacesById.get(
                category.space_id
              ) ?? null,
          })
        ),

      total:
        filteredCategories.length,

      limited:
        rows.length >= 1000,

      options: {
        spaces:
          allSpaces ?? [],
      },
    });
  } catch (error) {
    console.error(
      "Super Admin categories GET API error:",
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
// POST
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
          {
            error:
              "Unauthorized",
          },
          {
            status: 401,
          }
        )
      );
    }

    let body: CategoryBody;

    try {
      body =
        (await request.json()) as CategoryBody;
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

    const spaceId =
      cleanNullableText(
        body.space_id
      );

    const name =
      cleanNullableText(
        body.name
      );

    const kind =
      normalizeKind(
        body.kind
      );

    const icon =
      cleanNullableText(
        body.icon
      );

    const isSystem =
      Boolean(
        body.is_system
      );

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

    if (!name) {
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

    if (!kind) {
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
      data: space,
      error: spaceError,
    } =
      await loadSpace(
        spaceId
      );

    if (spaceError) {
      console.error(
        "Super Admin category space lookup error:",
        spaceError
      );

      return NextResponse.json(
        {
          error:
            "Failed to verify space.",
          details:
            spaceError.message,
          code:
            spaceError.code,
          hint:
            spaceError.hint ??
            null,
        },
        {
          status: 500,
        }
      );
    }

    if (!space) {
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

    const {
      data: createdCategory,
      error: createError,
    } =
      await supabaseAdmin
        .from("categories")
        .insert({
          space_id:
            spaceId,
          name,
          kind,
          icon,
          is_system:
            isSystem,
        })
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
      createError ||
      !createdCategory
    ) {
      console.error(
        "Super Admin category create error:",
        createError
      );

      return NextResponse.json(
        {
          error:
            "Failed to create category.",
          details:
            createError?.message ??
            "Unknown database error.",
          code:
            createError?.code ??
            null,
          hint:
            createError?.hint ??
            null,
        },
        {
          status:
            createError?.code ===
            "23505"
              ? 409
              : 500,
        }
      );
    }

    const {
      error: auditError,
    } =
      await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id:
            actor.id,

          space_id:
            spaceId,

          action:
            "CATEGORY_CREATE",

          entity_type:
            "category",

          entity_id:
            createdCategory.id,

          details: {
            new_values:
              createdCategory,
          },
        });

    if (auditError) {
      console.error(
        "Category create audit log error:",
        auditError
      );
    }

    return NextResponse.json(
      {
        success: true,

        category: {
          ...createdCategory,
          space,
        },

        message:
          "Category created successfully.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Super Admin categories POST API error:",
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
// PATCH
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
          {
            error:
              "Unauthorized",
          },
          {
            status: 401,
          }
        )
      );
    }

    let body: CategoryBody;

    try {
      body =
        (await request.json()) as CategoryBody;
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
      cleanNullableText(
        body.id
      );

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
    } =
      await supabaseAdmin
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
          details:
            lookupError.message,
          code:
            lookupError.code,
          hint:
            lookupError.hint ??
            null,
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
      body.space_id !==
      undefined
        ? cleanNullableText(
            body.space_id
          )
        : currentCategory.space_id;

    const nextName =
      body.name !==
      undefined
        ? cleanNullableText(
            body.name
          )
        : currentCategory.name;

    const nextKind =
      body.kind !==
      undefined
        ? normalizeKind(
            body.kind
          )
        : currentCategory.kind;

    const nextIcon =
      body.icon !==
      undefined
        ? cleanNullableText(
            body.icon
          )
        : currentCategory.icon;

    const nextIsSystem =
      body.is_system !==
      undefined
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
      error: spaceError,
    } =
      await loadSpace(
        nextSpaceId
      );

    if (spaceError) {
      return NextResponse.json(
        {
          error:
            "Failed to verify space.",
          details:
            spaceError.message,
          code:
            spaceError.code,
          hint:
            spaceError.hint ??
            null,
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
    } =
      await supabaseAdmin
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
        "Super Admin category update error:",
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
    } =
      await supabaseAdmin
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
        "Category update audit log error:",
        auditError
      );
    }

    return NextResponse.json({
      success: true,

      category: {
        ...updatedCategory,
        space:
          targetSpace,
      },

      message:
        "Category updated successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin categories PATCH API error:",
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
//
// Supports BOTH:
//
// /api/super-admin/categories?id=UUID
//
// AND:
//
// /api/super-admin/categories/UUID
//
// This matches the current Super Admin frontend.
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
          {
            error:
              "Unauthorized",
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

    // First support the old query-string format.
    let id =
      url.searchParams
        .get("id")
        ?.trim() ?? "";

    // Then support the frontend's dynamic
    // /categories/:id format.
    if (!id) {
      const pathname =
        url.pathname.replace(
          /\/+$/,
          ""
        );

      const pathParts =
        pathname.split("/");

      const lastPart =
        pathParts[
          pathParts.length - 1
        ];

      if (
        lastPart &&
        lastPart !==
          "categories"
      ) {
        id =
          decodeURIComponent(
            lastPart
          ).trim();
      }
    }

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
    } =
      await supabaseAdmin
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
        "Super Admin category delete lookup error:",
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
            lookupError.hint ??
            null,
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
    } =
      await supabaseAdmin
        .from("categories")
        .delete()
        .eq("id", id);

    if (deleteError) {
      console.error(
        "Super Admin category delete error:",
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
            deleteError.hint ??
            null,
        },
        {
          status: 409,
        }
      );
    }

    const {
      error: auditError,
    } =
      await supabaseAdmin
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
        "Category delete audit log error:",
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
      "Super Admin categories DELETE API error:",
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