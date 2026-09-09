import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UserRole = "user" | "admin" | "super_admin";
type UserStatus = "active" | "disabled";

type UpdateUserBody = {
  action?: "profile" | "role" | "status";
  full_name?: string | null;
  username?: string | null;
  email?: string;
  language?: "ar" | "en";
  avatar_url?: string | null;
  role?: UserRole;
  status?: UserStatus;
  password?: string;
};

function isValidRole(role: unknown): role is UserRole {
  return (
    role === "user" ||
    role === "admin" ||
    role === "super_admin"
  );
}

function isValidStatus(status: unknown): status is UserStatus {
  return status === "active" || status === "disabled";
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
    console.error("Super Admin profile check error:", profileError);
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

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { user, errorResponse } = await requireSuperAdmin();

    if (errorResponse || !user) {
      return (
        errorResponse ??
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    let body: UpdateUserBody;

    try {
      body = (await request.json()) as UpdateUserBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { data: targetProfile, error: targetProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, username, email, role, language, avatar_url, created_at"
        )
        .eq("id", id)
        .maybeSingle();

    if (targetProfileError) {
      console.error(
        "Target user profile lookup error:",
        targetProfileError
      );

      return NextResponse.json(
        { error: "Failed to load target user" },
        { status: 500 }
      );
    }

    if (!targetProfile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (targetProfile.role === "super_admin") {
      if (body.action !== "role" || body.role !== "super_admin") {
        return NextResponse.json(
          {
            error:
              "Super Admin accounts are protected from profile/status changes through this endpoint.",
          },
          { status: 403 }
        );
      }
    }

    // ----------------------------------------------
    // Profile update
    // ----------------------------------------------

    if (body.action === "profile") {
      const updateData: Record<string, unknown> = {};

      if (body.full_name !== undefined) {
        updateData.full_name =
          typeof body.full_name === "string"
            ? body.full_name.trim() || null
            : null;
      }

      if (body.username !== undefined) {
        updateData.username =
          typeof body.username === "string"
            ? body.username.trim() || null
            : null;
      }

      if (body.language !== undefined) {
        if (!["ar", "en"].includes(body.language)) {
          return NextResponse.json(
            { error: "Invalid language." },
            { status: 400 }
          );
        }

        updateData.language = body.language;
      }

      if (body.avatar_url !== undefined) {
        updateData.avatar_url =
          typeof body.avatar_url === "string"
            ? body.avatar_url.trim() || null
            : null;
      }

      // Role can be changed from the Edit User modal as well.
      if (body.role !== undefined) {
        if (!isValidRole(body.role)) {
          return NextResponse.json(
            { error: "Invalid role." },
            { status: 400 }
          );
        }

        // Never demote/protect the Super Admin account.
        if (
          targetProfile.role === "super_admin" &&
          body.role !== "super_admin"
        ) {
          return NextResponse.json(
            {
              error:
                "Super Admin accounts are protected from demotion.",
            },
            { status: 403 }
          );
        }

        // Never remove your own Super Admin role.
        if (
          id === user.id &&
          body.role !== "super_admin"
        ) {
          return NextResponse.json(
            {
              error: "You cannot remove your own Super Admin role.",
            },
            { status: 400 }
          );
        }

        updateData.role = body.role;
      }

      const newEmail =
        body.email !== undefined
          ? body.email.trim().toLowerCase()
          : undefined;

      if (body.email !== undefined) {
        if (!newEmail || !newEmail.includes("@")) {
          return NextResponse.json(
            { error: "A valid email is required." },
            { status: 400 }
          );
        }
      }

      if (body.password !== undefined) {
        if (body.password.length < 6) {
          return NextResponse.json(
            {
              error: "Password must be at least 6 characters.",
            },
            { status: 400 }
          );
        }
      }

      if (newEmail !== undefined || body.password !== undefined) {
        const authUpdate: {
          email?: string;
          password?: string;
          user_metadata?: Record<string, unknown>;
        } = {};

        if (newEmail !== undefined) {
          authUpdate.email = newEmail;
        }

        if (body.password !== undefined) {
          authUpdate.password = body.password;
        }

        const { error: authUpdateError } =
          await supabaseAdmin.auth.admin.updateUserById(
            id,
            authUpdate
          );

        if (authUpdateError) {
          console.error(
            "Auth profile update error:",
            authUpdateError
          );

          return NextResponse.json(
            {
              error:
                authUpdateError.message ||
                "Failed to update authentication data.",
            },
            { status: 500 }
          );
        }

        if (newEmail !== undefined) {
          updateData.email = newEmail;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: "No profile fields were provided for update." },
          { status: 400 }
        );
      }

      const { data: updatedProfile, error: profileUpdateError } =
        await supabaseAdmin
          .from("profiles")
          .update(updateData)
          .eq("id", id)
          .select(
            "id, full_name, username, email, role, language, avatar_url, created_at"
          )
          .single();

      if (profileUpdateError) {
        console.error(
          "Profile update error:",
          profileUpdateError
        );

        return NextResponse.json(
          {
            error:
              profileUpdateError.message ||
              "Failed to update user profile.",
          },
          { status: 500 }
        );
      }

      const { error: auditError } = await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: user.id,
          action:
            body.role !== undefined &&
            body.role !== targetProfile.role
              ? "ROLE_CHANGE"
              : "USER_PROFILE_UPDATE",
          entity_type: "profile",
          entity_id: id,
          details: {
            email_changed:
              newEmail !== undefined &&
              newEmail !== targetProfile.email,
            password_changed:
              body.password !== undefined,
            full_name_changed:
              body.full_name !== undefined,
            username_changed:
              body.username !== undefined,
            language_changed:
              body.language !== undefined,
            avatar_url_changed:
              body.avatar_url !== undefined,
            old_role: targetProfile.role,
            new_role: body.role ?? targetProfile.role,
          },
        });

      if (auditError) {
        console.error("User profile audit log error:", auditError);
      }

      return NextResponse.json({
        success: true,
        action: "profile",
        user: {
          ...updatedProfile,
          status: "active",
        },
        message: "User profile updated successfully.",
      });
    }

    // ----------------------------------------------
    // Role update
    // ----------------------------------------------

    if (body.action === "role") {
      if (!isValidRole(body.role)) {
        return NextResponse.json(
          {
            error:
              "Invalid role. Allowed roles: user, admin, super_admin",
          },
          { status: 400 }
        );
      }

      if (id === user.id && body.role !== "super_admin") {
        return NextResponse.json(
          {
            error: "You cannot remove your own Super Admin role.",
          },
          { status: 400 }
        );
      }

      if (
        targetProfile.role === "super_admin" &&
        body.role !== "super_admin"
      ) {
        return NextResponse.json(
          {
            error:
              "Super Admin accounts are protected from demotion.",
          },
          { status: 403 }
        );
      }

      if (
        targetProfile.role !== "super_admin" &&
        body.role === "super_admin"
      ) {
        // Promoting another user is allowed for the Super Admin.
      }

      if (targetProfile.role === body.role) {
        return NextResponse.json({
          success: true,
          action: "role",
          user: targetProfile,
          message: "User already has this role.",
        });
      }

      if (
        targetProfile.role === "super_admin" &&
        body.role !== "super_admin"
      ) {
        const { count, error: countError } =
          await supabaseAdmin
            .from("profiles")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("role", "super_admin");

        if (countError) {
          console.error(
            "Super Admin count check error:",
            countError
          );

          return NextResponse.json(
            {
              error:
                "Failed to verify Super Admin protection.",
            },
            { status: 500 }
          );
        }

        if ((count ?? 0) <= 1) {
          return NextResponse.json(
            {
              error:
                "You cannot remove the last Super Admin. Promote another user first.",
            },
            { status: 409 }
          );
        }
      }

      const { data: updatedUser, error: updateError } =
        await supabaseAdmin
          .from("profiles")
          .update({ role: body.role })
          .eq("id", id)
          .select(
            "id, full_name, username, email, role, language, avatar_url, created_at"
          )
          .single();

      if (updateError) {
        console.error(
          "Role update error:",
          updateError
        );

        return NextResponse.json(
          { error: "Failed to update user role" },
          { status: 500 }
        );
      }

      const { error: auditError } = await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: user.id,
          action: "ROLE_CHANGE",
          entity_type: "profile",
          entity_id: id,
          details: {
            old_role: targetProfile.role,
            new_role: body.role,
            target_user_email: targetProfile.email,
          },
        });

      if (auditError) {
        console.error("Role audit log error:", auditError);
      }

      return NextResponse.json({
        success: true,
        action: "role",
        user: updatedUser,
        message: "User role updated successfully.",
      });
    }

    // ----------------------------------------------
    // Status update
    // ----------------------------------------------

    if (body.action === "status") {
      if (!isValidStatus(body.status)) {
        return NextResponse.json(
          {
            error:
              'Invalid status. Allowed statuses: "active", "disabled"',
          },
          { status: 400 }
        );
      }

      if (targetProfile.role === "super_admin") {
        return NextResponse.json(
          {
            error: "Super Admin accounts cannot be disabled.",
          },
          { status: 403 }
        );
      }

      if (id === user.id && body.status === "disabled") {
        return NextResponse.json(
          {
            error: "You cannot disable your own account.",
          },
          { status: 400 }
        );
      }

      const {
        data: authUserData,
        error: authUserError,
      } = await supabaseAdmin.auth.admin.getUserById(id);

      if (authUserError || !authUserData?.user) {
        console.error(
          "Target Auth user lookup error:",
          authUserError
        );

        return NextResponse.json(
          { error: "Target authentication user not found" },
          { status: 404 }
        );
      }

      const isCurrentlyDisabled = Boolean(
        authUserData.user.banned_until &&
          new Date(authUserData.user.banned_until).getTime() >
            Date.now()
      );

      const shouldDisable = body.status === "disabled";

      if (
        (shouldDisable && isCurrentlyDisabled) ||
        (!shouldDisable && !isCurrentlyDisabled)
      ) {
        return NextResponse.json({
          success: true,
          action: "status",
          status: isCurrentlyDisabled
            ? "disabled"
            : "active",
          message: "User already has this status.",
        });
      }

      const { data: updatedAuthData, error: authUpdateError } =
        shouldDisable
          ? await supabaseAdmin.auth.admin.updateUserById(id, {
              ban_duration: "876000h",
            })
          : await supabaseAdmin.auth.admin.updateUserById(id, {
              ban_duration: "none",
            });

      if (authUpdateError || !updatedAuthData?.user) {
        console.error(
          "Auth status update error:",
          authUpdateError
        );

        return NextResponse.json(
          { error: "Failed to update user status" },
          { status: 500 }
        );
      }

      const newStatus: UserStatus = shouldDisable
        ? "disabled"
        : "active";

      const { error: auditError } = await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: user.id,
          action: shouldDisable
            ? "USER_DISABLED"
            : "USER_ENABLED",
          entity_type: "profile",
          entity_id: id,
          details: {
            old_status: isCurrentlyDisabled
              ? "disabled"
              : "active",
            new_status: newStatus,
            target_user_email: targetProfile.email,
          },
        });

      if (auditError) {
        console.error("Status audit log error:", auditError);
      }

      return NextResponse.json({
        success: true,
        action: "status",
        status: newStatus,
        userId: id,
        message: shouldDisable
          ? "User disabled successfully."
          : "User enabled successfully.",
      });
    }

    return NextResponse.json(
      {
        error:
          'Invalid action. Allowed actions: "profile", "role", "status"',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "Super Admin user PATCH error:",
      error
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { user, errorResponse } = await requireSuperAdmin();

    if (errorResponse || !user) {
      return (
        errorResponse ??
        NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    if (id === user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    const { data: targetProfile, error: targetProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, username, email, role, language, avatar_url, created_at"
        )
        .eq("id", id)
        .maybeSingle();

    if (targetProfileError) {
      console.error(
        "Delete target profile lookup error:",
        targetProfileError
      );

      return NextResponse.json(
        { error: "Failed to load target user." },
        { status: 500 }
      );
    }

    if (!targetProfile) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // Keep at least one Super Admin.
    if (targetProfile.role === "super_admin") {
      const { count, error: countError } =
        await supabaseAdmin
          .from("profiles")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("role", "super_admin");

      if (countError) {
        console.error(
          "Super Admin count check error:",
          countError
        );

        return NextResponse.json(
          {
            error:
              "Failed to verify Super Admin protection.",
          },
          { status: 500 }
        );
      }

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          {
            error:
              "You cannot delete the last Super Admin.",
          },
          { status: 409 }
        );
      }
    }

    // Preserve audit history where possible.
    // Remove user-owned operational relations first.
    const cleanupSteps: Array<{
      table: string;
      column: string;
    }> = [
      { table: "space_members", column: "user_id" },
      { table: "transactions", column: "user_id" },
      { table: "budgets", column: "user_id" },
      { table: "savings", column: "user_id" },
      { table: "accounts", column: "created_by" },
    ];

    for (const step of cleanupSteps) {
      const { error: cleanupError } = await supabaseAdmin
        .from(step.table)
        .delete()
        .eq(step.column, id);

      if (cleanupError) {
        console.error(
          `User delete cleanup error in ${step.table}:`,
          cleanupError
        );

        return NextResponse.json(
          {
            error:
              `Failed to clean up user data from ${step.table}.`,
          },
          { status: 500 }
        );
      }
    }

    // If this user owns spaces, delete the spaces through the
    // database relationship rather than leaving orphaned owners.
    const { error: ownedSpacesError } = await supabaseAdmin
      .from("spaces")
      .delete()
      .eq("owner_id", id);

    if (ownedSpacesError) {
      console.error(
        "User owned spaces cleanup error:",
        ownedSpacesError
      );

      return NextResponse.json(
        {
          error: "Failed to clean up user-owned spaces.",
        },
        { status: 500 }
      );
    }

    // Remove login-activity rows when that table exists.
    const { error: loginActivityError } = await supabaseAdmin
      .from("login_activity")
      .delete()
      .eq("user_id", id);

    if (loginActivityError) {
      console.warn(
        "Login activity cleanup skipped/failed:",
        loginActivityError
      );
    }

    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileDeleteError) {
      console.error(
        "Profile delete error:",
        profileDeleteError
      );

      return NextResponse.json(
        {
          error:
            profileDeleteError.message ||
            "Failed to delete user profile.",
        },
        { status: 500 }
      );
    }

    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(id);

    if (authDeleteError) {
      console.error(
        "Auth user delete error:",
        authDeleteError
      );

      return NextResponse.json(
        {
          error:
            authDeleteError.message ||
            "Profile was deleted, but authentication user deletion failed.",
        },
        { status: 500 }
      );
    }

    const { error: auditError } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        actor_id: user.id,
        action: "USER_DELETE",
        entity_type: "profile",
        entity_id: id,
        details: {
          deleted_user_id: id,
          deleted_user_email: targetProfile.email,
          deleted_user_name:
            targetProfile.full_name ??
            targetProfile.username ??
            null,
          deleted_user_role: targetProfile.role,
        },
      });

    if (auditError) {
      console.error("User delete audit log error:", auditError);
    }

    return NextResponse.json({
      success: true,
      deletedUserId: id,
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin user DELETE error:",
      error
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
