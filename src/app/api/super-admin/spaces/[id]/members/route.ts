import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AddMemberBody = {
  user_id?: string;
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
      "Super Admin space member profile check error:",
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

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id: spaceId } = await params;

    if (!spaceId) {
      return NextResponse.json(
        { error: "Space ID is required" },
        { status: 400 }
      );
    }

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

    let body: AddMemberBody;

    try {
      body =
        (await request.json()) as AddMemberBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const userId = body.user_id?.trim();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const {
      data: space,
      error: spaceError,
    } = await supabaseAdmin
      .from("spaces")
      .select("id, name, owner_id")
      .eq("id", spaceId)
      .maybeSingle();

    if (spaceError) {
      console.error(
        "Space lookup error while adding member:",
        spaceError
      );

      return NextResponse.json(
        { error: "Space lookup failed" },
        { status: 500 }
      );
    }

    if (!space) {
      return NextResponse.json(
        { error: "Space not found" },
        { status: 404 }
      );
    }

    const {
      data: targetProfile,
      error: targetProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, username, email"
      )
      .eq("id", userId)
      .maybeSingle();

    if (targetProfileError) {
      console.error(
        "Target profile lookup error:",
        targetProfileError
      );

      return NextResponse.json(
        {
          error: "Target user lookup failed",
        },
        { status: 500 }
      );
    }

    if (!targetProfile) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    const {
      data: authTarget,
      error: authTargetError,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        userId
      );

    if (
      authTargetError ||
      !authTarget?.user
    ) {
      console.error(
        "Target auth user lookup error:",
        authTargetError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify target user status",
        },
        { status: 500 }
      );
    }

    const bannedUntil =
      authTarget.user.banned_until;

    const isDisabled = Boolean(
      bannedUntil &&
        new Date(bannedUntil).getTime() >
          Date.now()
    );

    if (isDisabled) {
      return NextResponse.json(
        {
          error:
            "Disabled users cannot be added to a space.",
        },
        { status: 409 }
      );
    }

    const {
      data: existingMember,
      error: existingMemberError,
    } = await supabaseAdmin
      .from("space_members")
      .select(
        "space_id, user_id, role"
      )
      .eq("space_id", spaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingMemberError) {
      console.error(
        "Existing member lookup error:",
        existingMemberError
      );

      return NextResponse.json(
        {
          error: "Membership lookup failed",
        },
        { status: 500 }
      );
    }

    if (existingMember) {
      return NextResponse.json(
        {
          error:
            "User is already a member of this space.",
        },
        { status: 409 }
      );
    }

    const {
      data: membership,
      error: membershipError,
    } = await supabaseAdmin
      .from("space_members")
      .insert({
        space_id: spaceId,
        user_id: userId,
        role: "member",
      })
      .select(
        "space_id, user_id, role, created_at"
      )
      .single();

    if (membershipError) {
      console.error(
        "Space member insert error:",
        membershipError
      );

      return NextResponse.json(
        { error: "Failed to add member" },
        { status: 500 }
      );
    }

    const { error: auditError } =
      await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: actor.id,
          action: "SPACE_MEMBER_ADD",
          entity_type: "space_members",
          entity_id: spaceId,
          details: {
            space_id: spaceId,
            space_name: space.name,
            added_user_id: userId,
            added_user_email:
              targetProfile.email,
            member_role: "member",
          },
        });

    if (auditError) {
      console.error(
        "Space member audit log error:",
        auditError
      );
    }

    return NextResponse.json(
      {
        success: true,
        membership,
        user: targetProfile,
        message:
          "Member added successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Super Admin add space member API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

type UpdateMemberRoleBody = {
  user_id?: string;
  role?: "viewer" | "member" | "admin";
};

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id: spaceId } = await params;

    if (!spaceId) {
      return NextResponse.json(
        { error: "Space ID is required" },
        { status: 400 }
      );
    }

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

    let body: UpdateMemberRoleBody;

    try {
      body =
        (await request.json()) as UpdateMemberRoleBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const userId = body.user_id?.trim();
    const role = body.role;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (
      role !== "viewer" &&
      role !== "member" &&
      role !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid space member role. Allowed roles: viewer, member, admin.",
        },
        { status: 400 }
      );
    }

    const {
      data: space,
      error: spaceError,
    } = await supabaseAdmin
      .from("spaces")
      .select("id, name, owner_id")
      .eq("id", spaceId)
      .maybeSingle();

    if (spaceError) {
      console.error(
        "Space lookup error while updating member role:",
        spaceError
      );

      return NextResponse.json(
        { error: "Space lookup failed" },
        { status: 500 }
      );
    }

    if (!space) {
      return NextResponse.json(
        { error: "Space not found" },
        { status: 404 }
      );
    }

    if (space.owner_id === userId) {
      return NextResponse.json(
        {
          error:
            "The Space Owner is protected. Change the owner separately before changing this membership role.",
        },
        { status: 409 }
      );
    }

    const {
      data: membership,
      error: membershipError,
    } = await supabaseAdmin
      .from("space_members")
      .select(
        "space_id, user_id, role, created_at"
      )
      .eq("space_id", spaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "Membership lookup error while updating role:",
        membershipError
      );

      return NextResponse.json(
        { error: "Membership lookup failed" },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "User is not a member of this space.",
        },
        { status: 404 }
      );
    }

    if (membership.role === role) {
      return NextResponse.json({
        success: true,
        membership,
        message:
          "Member already has this role.",
      });
    }

    const {
      data: updatedMembership,
      error: updateError,
    } = await supabaseAdmin
      .from("space_members")
      .update({ role })
      .eq("space_id", spaceId)
      .eq("user_id", userId)
      .select(
        "space_id, user_id, role, created_at"
      )
      .single();

    if (updateError) {
      console.error(
        "Space member role update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Failed to update member role",
        },
        { status: 500 }
      );
    }

    const {
      data: targetProfile,
      error: targetProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, username, email"
      )
      .eq("id", userId)
      .maybeSingle();

    if (targetProfileError) {
      console.error(
        "Target profile lookup after role update error:",
        targetProfileError
      );
    }

    const { error: auditError } =
      await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: actor.id,
          action:
            "SPACE_MEMBER_ROLE_CHANGE",
          entity_type: "space_members",
          entity_id: spaceId,
          details: {
            space_id: spaceId,
            space_name: space.name,
            target_user_id: userId,
            target_user_email:
              targetProfile?.email ?? null,
            old_role: membership.role,
            new_role: role,
          },
        });

    if (auditError) {
      console.error(
        "Space member role audit log error:",
        auditError
      );
    }

    return NextResponse.json({
      success: true,
      membership: updatedMembership,
      message:
        "Member role updated successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin member role PATCH API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

type RemoveMemberBody = {
  user_id?: string;
};

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id: spaceId } = await params;

    if (!spaceId) {
      return NextResponse.json(
        { error: "Space ID is required" },
        { status: 400 }
      );
    }

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

    let body: RemoveMemberBody;

    try {
      body =
        (await request.json()) as RemoveMemberBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const userId = body.user_id?.trim();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const {
      data: space,
      error: spaceError,
    } = await supabaseAdmin
      .from("spaces")
      .select("id, name, owner_id")
      .eq("id", spaceId)
      .maybeSingle();

    if (spaceError) {
      console.error(
        "Space lookup error while removing member:",
        spaceError
      );

      return NextResponse.json(
        { error: "Space lookup failed" },
        { status: 500 }
      );
    }

    if (!space) {
      return NextResponse.json(
        { error: "Space not found" },
        { status: 404 }
      );
    }

    if (space.owner_id === userId) {
      return NextResponse.json(
        {
          error:
            "The Space Owner is protected and cannot be removed from the space.",
        },
        { status: 409 }
      );
    }

    const {
      data: membership,
      error: membershipError,
    } = await supabaseAdmin
      .from("space_members")
      .select(
        "space_id, user_id, role, created_at"
      )
      .eq("space_id", spaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "Membership lookup error while removing member:",
        membershipError
      );

      return NextResponse.json(
        { error: "Membership lookup failed" },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "User is not a member of this space.",
        },
        { status: 404 }
      );
    }

    const {
      data: targetProfile,
      error: targetProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, username, email"
      )
      .eq("id", userId)
      .maybeSingle();

    if (targetProfileError) {
      console.error(
        "Target profile lookup before member removal error:",
        targetProfileError
      );
    }

    const { error: deleteError } =
      await supabaseAdmin
        .from("space_members")
        .delete()
        .eq("space_id", spaceId)
        .eq("user_id", userId);

    if (deleteError) {
      console.error(
        "Space member delete error:",
        deleteError
      );

      return NextResponse.json(
        { error: "Failed to remove member" },
        { status: 500 }
      );
    }

    const { error: auditError } =
      await supabaseAdmin
        .from("audit_logs")
        .insert({
          actor_id: actor.id,
          action:
            "SPACE_MEMBER_REMOVE",
          entity_type: "space_members",
          entity_id: spaceId,
          details: {
            space_id: spaceId,
            space_name: space.name,
            removed_user_id: userId,
            removed_user_email:
              targetProfile?.email ?? null,
            previous_role: membership.role,
          },
        });

    if (auditError) {
      console.error(
        "Space member removal audit log error:",
        auditError
      );
    }

    return NextResponse.json({
      success: true,
      membership,
      message:
        "Member removed from the space successfully.",
    });
  } catch (error) {
    console.error(
      "Super Admin remove space member API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}