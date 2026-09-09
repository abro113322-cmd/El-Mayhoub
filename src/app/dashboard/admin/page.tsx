"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type User = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  role: "user" | "admin" | "super_admin";
  language: "ar" | "en";
  avatar_url: string | null;
  created_at: string | null;
  status: "active" | "disabled";
};

type EditableRole = "user" | "admin";

type RoleFilter =
  | "all"
  | "user"
  | "admin"
  | "super_admin";


type UserForm = {
  full_name: string;
  username: string;
  email: string;
  password: string;
  role: "user" | "admin" | "super_admin";
  language: "ar" | "en";
  avatar_url: string;
};

type Account = {
  id: string;
  space_id: string;
  name: string;
  type: string;
  currency: string;
  opening_balance: number;
  description: string | null;
  is_archived: boolean;
  created_by: string | null;
  created_at: string | null;
  owner: {
    id: string;
    name: string;
    username: string | null;
    email: string | null;
  } | null;
  transactions_count: number;
  total_income: number;
  total_expenses: number;
  current_balance: number;
};

type AccountTransaction = {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  occurred_at: string;
  description: string | null;
  payment_method: string | null;
  notes: string | null;
  user_id: string | null;
  created_at: string | null;
};

type Space = {
  id: string;
  name: string;
  type: string;
  base_currency: string;
  owner_id: string | null;
  owner: {
    id: string;
    name: string;
    username: string | null;
    email: string | null;
  } | null;
  members_count: number;
  accounts_count: number;
  created_at: string | null;
};

type SpaceMemberRole = "viewer" | "member" | "admin";

type SpaceMember = {
  user_id: string;
  role: SpaceMemberRole;
  created_at: string | null;
  user: {
    id: string;
    name: string;
    username: string | null;
    email: string | null;
  } | null;
};

type SpaceAccount = {
  id: string;
  name: string;
  type: string;
  currency: string;
  is_archived: boolean;
  created_by: string | null;
  created_at: string | null;
  owner: {
    id: string;
    name: string;
    username: string | null;
    email: string | null;
  } | null;
};

type SpaceDetails = Space & {
  members: SpaceMember[];
  accounts: SpaceAccount[];
};

type Tab = "users" | "accounts" | "spaces" | "budgets" | "savings" | "categories" | "transactions" | "audit" | "login_activity";

type AuditLog = {
  id: number;
  actor_id: string | null;
  actor: {
    id: string;
    full_name: string | null;
    username: string | null;
    email: string | null;
  } | null;
  space_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

type LoginActivity = {
  id: string;
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  ip_address: string | null;
  continent: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  postal_code: string | null;
  user_agent: string | null;
  logged_in_at: string;
};

type AccountForm = {
  name: string;
  type: string;
  currency: string;
  opening_balance: string;
  description: string;
  owner_id: string | null;
};

type TransactionCategory = {
  id: string;
  name: string;
  space_id: string;
};

type AdminCategory = {
  id: string;
  space_id: string;
  name: string;
  kind: string;
  icon: string | null;
  is_system: boolean;
  created_at: string | null;
  space: {
    id: string;
    name: string;
    type: string;
    base_currency: string;
  } | null;
};

type TransactionOptionUser = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  role: "user" | "admin" | "super_admin";
};

type TransactionOptionSpace = {
  id: string;
  name: string;
  type: string;
  base_currency: string;
};

type TransactionOptionAccount = {
  id: string;
  name: string;
  currency: string;
  space_id: string;
  is_archived?: boolean;
};

type AdminTransaction = {
  id: string;
  user_id: string | null;
  space_id: string;
  account_id: string;
  category_id: string | null;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  occurred_at: string;
  description: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string | null;
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
    email: string | null;
    role: "user" | "admin" | "super_admin";
  } | null;
  account: {
    id: string;
    name: string;
    currency: string;
    space_id: string;
  } | null;
  space: {
    id: string;
    name: string;
    type: string;
    base_currency: string;
  } | null;
};


type AdminBudget = {
  id: string;
  user_id: string;
  space_id: string;
  category_id: string;
  name: string;
  amount: number;
  spent: number | null;
  start_date: string;
  end_date: string;
  created_at: string | null;
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
    email: string | null;
    role: "user" | "admin" | "super_admin";
  } | null;
  space: {
    id: string;
    name: string;
    type: string;
    base_currency: string;
  } | null;
  category: {
    id: string;
    name: string;
    space_id: string;
  } | null;
};


type AdminSaving = {
  id: string;
  user_id: string;
  space_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  created_at: string | null;
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
    email: string | null;
    role: "user" | "admin" | "super_admin";
  } | null;
  space: {
    id: string;
    name: string;
    type: string;
    base_currency: string;
  } | null;
  remaining: number;
  progress: number;
};

export default function SuperAdminPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] =
    useState<Tab>("users");

  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] =
    useState<SpaceDetails | null>(null);
  const [loadingSpaces, setLoadingSpaces] =
    useState(true);
  const [loadingSpaceDetails, setLoadingSpaceDetails] =
    useState(false);

  const [showAddMemberModal, setShowAddMemberModal] =
    useState(false);

  const [selectedMemberId, setSelectedMemberId] =
    useState("");

  const [addingMember, setAddingMember] =
    useState(false);

  const [memberRoleChanges, setMemberRoleChanges] =
    useState<Record<string, SpaceMemberRole>>({});

  const [savingMemberRoleUserId, setSavingMemberRoleUserId] =
    useState<string | null>(null);

  const [roleChanges, setRoleChanges] = useState<
    Record<string, EditableRole>
  >({});

  const [savingUserId, setSavingUserId] =
    useState<string | null>(null);

  const [savingAccountId, setSavingAccountId] =
    useState<string | null>(null);

  const [currentUserId, setCurrentUserId] =
    useState("");

  const [loadingUsers, setLoadingUsers] =
    useState(true);

  const [loadingAccounts, setLoadingAccounts] =
    useState(true);

  const [accessChecking, setAccessChecking] =
    useState(true);

  const [authorized, setAuthorized] =
    useState(false);

  const [error, setError] = useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  // --------------------------------------------------
  // Super Admin category management
  // --------------------------------------------------

  async function loadAdminCategories() {
    try {
      setLoadingAdminCategories(true);

      const params = new URLSearchParams();

      if (categorySearch.trim()) {
        params.set("search", categorySearch.trim());
      }

      if (categorySpaceFilter) {
        params.set("space_id", categorySpaceFilter);
      }

      if (categoryKindFilter) {
        params.set("kind", categoryKindFilter);
      }

      const query = params.toString();

      const response = await fetch(
        `/api/super-admin/categories${query ? `?${query}` : ""}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load Super Admin categories."
        );
      }

      setAdminCategories(data.categories ?? []);
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load Super Admin categories."
      );
    } finally {
      setLoadingAdminCategories(false);
    }
  }

  function clearCategoryFilters() {
    setCategorySearch("");
    setCategorySpaceFilter("");
    setCategoryKindFilter("");
  }

  function openCreateCategory() {
    setSelectedAdminCategory(null);
    setCategoryForm({
      space_id: spaces[0]?.id ?? "",
      name: "",
      kind: "",
      icon: "",
      is_system: false,
    });
    setShowCategoryModal(true);
  }

  function openEditCategory(category: AdminCategory) {
    setSelectedAdminCategory(category);
    setCategoryForm({
      space_id: category.space_id,
      name: category.name,
      kind: category.kind,
      icon: category.icon ?? "",
      is_system: Boolean(category.is_system),
    });
    setShowCategoryModal(true);
  }

  function closeCategoryModal() {
    if (savingCategory) return;
    setShowCategoryModal(false);
    setSelectedAdminCategory(null);
  }

  async function saveAdminCategory() {
    if (!categoryForm.space_id) {
      alert("Please select a space.");
      return;
    }

    if (!categoryForm.name.trim()) {
      alert("Category name is required.");
      return;
    }

    if (!categoryForm.kind.trim()) {
      alert("Category kind is required.");
      return;
    }

    const payload = {
      space_id: categoryForm.space_id,
      name: categoryForm.name.trim(),
      kind: categoryForm.kind.trim(),
      icon: categoryForm.icon.trim() || null,
      is_system: categoryForm.is_system,
    };

    try {
      setSavingCategory(true);

      const response = await fetch(
        "/api/super-admin/categories",
        {
          method: selectedAdminCategory
            ? "PATCH"
            : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            selectedAdminCategory
              ? {
                  id: selectedAdminCategory.id,
                  ...payload,
                }
              : payload
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            "Failed to save category."
        );
        return;
      }

      await loadAdminCategories();
      closeCategoryModal();
      alert(
        selectedAdminCategory
          ? "Category updated successfully."
          : "Category created successfully."
      );
    } catch (error) {
      console.error(error);
      alert(
        "Something went wrong while saving the category."
      );
    } finally {
      setSavingCategory(false);
    }
  }

  async function deleteAdminCategory(
    category: AdminCategory
  ) {
    const ok = confirm(
      `Delete category "${category.name}" from "${category.space?.name ?? "this space"}"?`
    );

    if (!ok) return;

    try {
      setSavingCategory(true);

      const response = await fetch(
        `/api/super-admin/categories/${category.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            "Failed to delete category."
        );
        return;
      }

      await loadAdminCategories();
      alert("Category deleted successfully.");
    } catch (error) {
      console.error(error);
      alert(
        "Something went wrong while deleting the category."
      );
    } finally {
      setSavingCategory(false);
    }
  }

  // --------------------------------------------------
  // Super Admin transaction management
  // --------------------------------------------------

  const [adminTransactions, setAdminTransactions] =
    useState<AdminTransaction[]>([]);

  const [loadingAdminTransactions, setLoadingAdminTransactions] =
    useState(true);

  const [transactionSearch, setTransactionSearch] =
    useState("");

  const [transactionTypeFilter, setTransactionTypeFilter] =
    useState<"all" | "income" | "expense" | "transfer">("all");

  const [transactionUserFilter, setTransactionUserFilter] =
    useState("");

  const [transactionAccountFilter, setTransactionAccountFilter] =
    useState("");

  const [transactionSpaceFilter, setTransactionSpaceFilter] =
    useState("");

  const [transactionDateFrom, setTransactionDateFrom] =
    useState("");

  const [transactionDateTo, setTransactionDateTo] =
    useState("");

  const [transactionMinAmount, setTransactionMinAmount] =
    useState("");

  const [transactionMaxAmount, setTransactionMaxAmount] =
    useState("");

  const [transactionCategories, setTransactionCategories] =
    useState<TransactionCategory[]>([]);

  // Transaction modal options come from the same Super Admin
  // transactions API so the form always uses a complete, consistent
  // set of users, spaces, accounts and categories.
  const [transactionUsers, setTransactionUsers] =
    useState<TransactionOptionUser[]>([]);

  const [transactionSpaces, setTransactionSpaces] =
    useState<TransactionOptionSpace[]>([]);

  const [transactionAccounts, setTransactionAccounts] =
    useState<TransactionOptionAccount[]>([]);

  const [showTransactionModal, setShowTransactionModal] =
    useState(false);

  const [selectedAdminTransaction, setSelectedAdminTransaction] =
    useState<AdminTransaction | null>(null);

  const [savingTransaction, setSavingTransaction] =
    useState(false);

  const [transactionForm, setTransactionForm] =
    useState({
      user_id: "",
      space_id: "",
      account_id: "",
      category_id: "",
      type: "expense" as "income" | "expense" | "transfer",
      amount: "",
      currency: "EGP",
      occurred_at: new Date().toISOString().slice(0, 16),
      description: "",
      payment_method: "",
      notes: "",
    });

  // --------------------------------------------------
  // Super Admin budget management
  // --------------------------------------------------

  const [adminBudgets, setAdminBudgets] =
    useState<AdminBudget[]>([]);

  const [loadingAdminBudgets, setLoadingAdminBudgets] =
    useState(true);

  const [budgetSearch, setBudgetSearch] =
    useState("");

  const [budgetUserFilter, setBudgetUserFilter] =
    useState("");

  const [budgetSpaceFilter, setBudgetSpaceFilter] =
    useState("");

  const [budgetCategoryFilter, setBudgetCategoryFilter] =
    useState("");

  const [budgetDateFrom, setBudgetDateFrom] =
    useState("");

  const [budgetDateTo, setBudgetDateTo] =
    useState("");

  const [budgetMinAmount, setBudgetMinAmount] =
    useState("");

  const [budgetMaxAmount, setBudgetMaxAmount] =
    useState("");

  const [budgetCategories, setBudgetCategories] =
    useState<TransactionCategory[]>([]);

  const [showBudgetModal, setShowBudgetModal] =
    useState(false);

  const [selectedAdminBudget, setSelectedAdminBudget] =
    useState<AdminBudget | null>(null);

  const [savingBudget, setSavingBudget] =
    useState(false);

  const [budgetForm, setBudgetForm] =
    useState({
      user_id: "",
      space_id: "",
      category_id: "",
      name: "",
      amount: "",
      spent: "0",
      start_date: "",
      end_date: "",
    });


  // --------------------------------------------------
  // Super Admin savings management
  // --------------------------------------------------

  const [adminSavings, setAdminSavings] =
    useState<AdminSaving[]>([]);

  const [loadingAdminSavings, setLoadingAdminSavings] =
    useState(true);

  const [savingSearch, setSavingSearch] =
    useState("");

  const [savingUserFilter, setSavingUserFilter] =
    useState("");

  const [savingSpaceFilter, setSavingSpaceFilter] =
    useState("");

  const [savingDateFrom, setSavingDateFrom] =
    useState("");

  const [savingDateTo, setSavingDateTo] =
    useState("");

  const [savingMinAmount, setSavingMinAmount] =
    useState("");

  const [savingMaxAmount, setSavingMaxAmount] =
    useState("");

  const [showSavingModal, setShowSavingModal] =
    useState(false);

  const [selectedAdminSaving, setSelectedAdminSaving] =
    useState<AdminSaving | null>(null);

  const [savingGoalForm, setSavingGoalForm] =
    useState({
      user_id: "",
      space_id: "",
      name: "",
      target_amount: "",
      current_amount: "0",
      deadline: "",
    });

  const [savingGoalSaving, setSavingGoalSaving] =
    useState(false);

  // --------------------------------------------------
  // Super Admin category management
  // --------------------------------------------------

  const [adminCategories, setAdminCategories] =
    useState<AdminCategory[]>([]);

  const [loadingAdminCategories, setLoadingAdminCategories] =
    useState(true);

  const [categorySearch, setCategorySearch] =
    useState("");

  const [categorySpaceFilter, setCategorySpaceFilter] =
    useState("");

  const [categoryKindFilter, setCategoryKindFilter] =
    useState("");

  const [showCategoryModal, setShowCategoryModal] =
    useState(false);

  const [selectedAdminCategory, setSelectedAdminCategory] =
    useState<AdminCategory | null>(null);

  const [savingCategory, setSavingCategory] =
    useState(false);

  const [categoryForm, setCategoryForm] =
    useState({
      space_id: "",
      name: "",
      kind: "",
      icon: "",
      is_system: false,
    });

  // --------------------------------------------------
  // --------------------------------------------------
  // Login activity
  // --------------------------------------------------

  const [loginActivities, setLoginActivities] =
    useState<LoginActivity[]>([]);

  const [loadingLoginActivities, setLoadingLoginActivities] =
    useState(false);

  const [loginActivitySearch, setLoginActivitySearch] =
    useState("");

  const [loginActivityUserFilter, setLoginActivityUserFilter] =
    useState("");

  const [loginActivityDateFrom, setLoginActivityDateFrom] =
    useState("");

  const [loginActivityDateTo, setLoginActivityDateTo] =
    useState("");

  // --------------------------------------------------
  // Audit log management
  // --------------------------------------------------

  const [auditLogs, setAuditLogs] =
    useState<AuditLog[]>([]);

  const [loadingAuditLogs, setLoadingAuditLogs] =
    useState(false);

  const [auditSearch, setAuditSearch] =
    useState("");

  const [auditActionFilter, setAuditActionFilter] =
    useState("");

  const [auditUserFilter, setAuditUserFilter] =
    useState("");

  const [auditDateFrom, setAuditDateFrom] =
    useState("");

  const [auditDateTo, setAuditDateTo] =
    useState("");

  // --------------------------------------------------
  // User search / filter
  // --------------------------------------------------

  const [userSearch, setUserSearch] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState<RoleFilter>("all");


  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedAdminUser, setSelectedAdminUser] = useState<User | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [userForm, setUserForm] = useState<UserForm>({
    full_name: "",
    username: "",
    email: "",
    password: "",
    role: "user",
    language: "en",
    avatar_url: "",
  });

  // --------------------------------------------------
  // Account state
  // --------------------------------------------------

  const [selectedAccount, setSelectedAccount] =
    useState<Account | null>(null);

  const [accountTransactions, setAccountTransactions] =
    useState<AccountTransaction[]>([]);

  const [loadingTransactions, setLoadingTransactions] =
    useState(false);

  const [accountForm, setAccountForm] =
    useState<AccountForm>({
      name: "",
      type: "cash",
      currency: "EGP",
      opening_balance: "",
      description: "",
      owner_id: null,
    });

  const [showCreateAccountModal, setShowCreateAccountModal] =
    useState(false);

  const [creatingAccount, setCreatingAccount] =
    useState(false);

  const [newAccountForm, setNewAccountForm] =
    useState({
      name: "",
      type: "cash",
      currency: "EGP",
      opening_balance: "0",
      description: "",
      owner_id: "",
      space_id: "",
      is_archived: false,
    });

  const [accountModalMode, setAccountModalMode] =
    useState<"view" | "edit" | null>(null);

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (!authorized || activeTab !== "login_activity") {
      return;
    }

    void loadLoginActivities();
  }, [activeTab, authorized]);

  useEffect(() => {
    if (!authorized || activeTab !== "audit") {
      return;
    }

    void loadAuditLogs();
  }, [activeTab, authorized]);

  // --------------------------------------------------
  // Initial data
  // --------------------------------------------------

  async function loadInitialData() {
    try {
      setAccessChecking(true);
      setAuthorized(false);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setCurrentUserId(user.id);

      // --------------------------------------------------
      // SUPER ADMIN ROUTE GUARD
      // --------------------------------------------------

      const {
        data: currentProfile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (
        profileError ||
        !currentProfile
      ) {
        console.error(
          "Super Admin route guard profile error:",
          profileError
        );

        router.replace("/dashboard/settings");
        return;
      }

      if (
        currentProfile.role !== "super_admin"
      ) {
        router.replace("/dashboard/settings");
        return;
      }

      setAuthorized(true);

      await Promise.all([
        loadUsers(),
        loadAccounts(),
        loadSpaces(),
        loadAdminTransactions(),
        loadAdminSavings(),
        loadAdminBudgets(),
        loadAdminCategories(),
      ]);
    } catch (error) {
      console.error(error);

      setError(
        "Something went wrong while loading the admin panel."
      );
    } finally {
      setAccessChecking(false);
    }
  }

  // --------------------------------------------------
  // Users
  // --------------------------------------------------

  async function loadUsers() {
    try {
      setLoadingUsers(true);

      const response = await fetch(
        "/api/super-admin/users",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load users."
        );
      }

      const loadedUsers: User[] =
        data.users ?? [];

      setUsers(loadedUsers);

      const initialRoles: Record<
        string,
        EditableRole
      > = {};

      loadedUsers.forEach((user) => {
        if (
          user.role === "user" ||
          user.role === "admin"
        ) {
          initialRoles[user.id] = user.role;
        }
      });

      setRoleChanges(initialRoles);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load users."
      );
    } finally {
      setLoadingUsers(false);
    }
  }

  // --------------------------------------------------
  // Accounts
  // --------------------------------------------------

  async function loadAccounts() {
    try {
      setLoadingAccounts(true);

      const response = await fetch(
        "/api/super-admin/accounts",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load accounts."
        );
      }

      setAccounts(data.accounts ?? []);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load accounts."
      );
    } finally {
      setLoadingAccounts(false);
    }
  }

  // --------------------------------------------------
  // Spaces
  // --------------------------------------------------

  async function loadSpaces() {
    try {
      setLoadingSpaces(true);

      const response = await fetch(
        "/api/super-admin/spaces",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load spaces."
        );
      }

      setSpaces(data.spaces ?? []);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load spaces."
      );
    } finally {
      setLoadingSpaces(false);
    }
  }

  async function openSpaceDetails(space: Space) {
    try {
      setLoadingSpaceDetails(true);

      const response = await fetch(
        `/api/super-admin/spaces/${space.id}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            "Failed to load space details."
        );
        return;
      }

      const loadedSpace = data.space ?? null;
      setSelectedSpace(loadedSpace);

      if (loadedSpace) {
        const initialMemberRoles: Record<string, SpaceMemberRole> = {};

        loadedSpace.members.forEach((member: SpaceMember) => {
          initialMemberRoles[member.user_id] = member.role;
        });

        setMemberRoleChanges(initialMemberRoles);
      } else {
        setMemberRoleChanges({});
      }
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while loading space details."
      );
    } finally {
      setLoadingSpaceDetails(false);
    }
  }

  function closeSpaceDetails() {
    setSelectedSpace(null);
    setShowAddMemberModal(false);
    setSelectedMemberId("");
    setMemberRoleChanges({});
  }

  function openAddMemberModal() {
    if (!selectedSpace) return;

    setSelectedMemberId("");
    setMemberRoleChanges({});
    setShowAddMemberModal(true);
  }

  function closeAddMemberModal() {
    if (addingMember) return;

    setShowAddMemberModal(false);
    setSelectedMemberId("");
  }

  async function addMemberToSpace() {
    if (!selectedSpace || !selectedMemberId) {
      alert("Please select a user first.");
      return;
    }

    const selectedUser = users.find(
      (user) => user.id === selectedMemberId
    );

    if (!selectedUser) {
      alert("Selected user was not found.");
      return;
    }

    const confirmed = confirm(
      `Add "${selectedUser.full_name || selectedUser.email || selectedUser.username || "this user"}" to "${selectedSpace.name}"?`
    );

    if (!confirmed) return;

    try {
      setAddingMember(true);

      const response = await fetch(
        `/api/super-admin/spaces/${selectedSpace.id}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: selectedMemberId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            "Failed to add member to this space."
        );
        return;
      }

      setShowAddMemberModal(false);
      setSelectedMemberId("");

      await Promise.all([
        loadSpaces(),
        openSpaceDetails(selectedSpace),
      ]);

      alert("Member added successfully.");
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while adding the member."
      );
    } finally {
      setAddingMember(false);
    }
  }

  function handleMemberRoleChange(
    userId: string,
    role: SpaceMemberRole
  ) {
    setMemberRoleChanges((prev) => ({
      ...prev,
      [userId]: role,
    }));
  }

  async function saveMemberRole(
    member: SpaceMember
  ) {
    if (!selectedSpace) return;

    const newRole =
      memberRoleChanges[member.user_id] ??
      member.role;

    if (newRole === member.role) return;

    // The owner is intentionally protected. The owner relationship
    // is stored separately on spaces.owner_id and should not be
    // weakened by changing the membership role.
    if (selectedSpace.owner_id === member.user_id) {
      alert(
        "The Space Owner is protected. Change the owner separately before changing this membership role."
      );
      return;
    }

    const displayName =
      member.user?.name ||
      member.user?.username ||
      member.user?.email ||
      "this member";

    const confirmed = confirm(
      `Change ${displayName}'s role from "${member.role}" to "${newRole}"?`
    );

    if (!confirmed) return;

    try {
      setSavingMemberRoleUserId(member.user_id);

      const response = await fetch(
        `/api/super-admin/spaces/${selectedSpace.id}/members`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: member.user_id,
            role: newRole,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            "Failed to update the member role."
        );
        return;
      }

      setSelectedSpace((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.map((item) =>
                item.user_id === member.user_id
                  ? { ...item, role: newRole }
                  : item
              ),
            }
          : prev
      );

      setMemberRoleChanges((prev) => {
        const next = { ...prev };
        delete next[member.user_id];
        return next;
      });

      alert("Member role updated successfully.");
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while updating the member role."
      );
    } finally {
      setSavingMemberRoleUserId(null);
    }
  }

  // --------------------------------------------------
  // Super Admin transaction management
  // --------------------------------------------------

  async function loadLoginActivities() {
    try {
      setLoadingLoginActivities(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error("Authentication session not found.");
      }

      const response = await fetch(
        "/api/auth/login-activity?limit=500",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load login activity."
        );
      }

      setLoginActivities(data.activities ?? []);
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load login activity."
      );
    } finally {
      setLoadingLoginActivities(false);
    }
  }

  const filteredLoginActivities = useMemo(() => {
    const normalizedSearch =
      loginActivitySearch.trim().toLowerCase();

    return loginActivities.filter((activity) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        activity.full_name?.toLowerCase().includes(normalizedSearch) ||
        activity.email?.toLowerCase().includes(normalizedSearch) ||
        activity.ip_address?.toLowerCase().includes(normalizedSearch) ||
        activity.city?.toLowerCase().includes(normalizedSearch) ||
        activity.country?.toLowerCase().includes(normalizedSearch);

      const activityDate = new Date(activity.logged_in_at);
      const fromDate = loginActivityDateFrom
        ? new Date(`${loginActivityDateFrom}T00:00:00`)
        : null;
      const toDate = loginActivityDateTo
        ? new Date(`${loginActivityDateTo}T23:59:59.999`)
        : null;

      const matchesUser =
        !loginActivityUserFilter ||
        activity.user_id === loginActivityUserFilter;

      const matchesFrom = !fromDate || activityDate >= fromDate;
      const matchesTo = !toDate || activityDate <= toDate;

      return Boolean(
        matchesSearch && matchesUser && matchesFrom && matchesTo
      );
    });
  }, [
    loginActivities,
    loginActivitySearch,
    loginActivityUserFilter,
    loginActivityDateFrom,
    loginActivityDateTo,
  ]);

  async function loadAuditLogs() {
    try {
      setLoadingAuditLogs(true);

      const params = new URLSearchParams();

      if (auditActionFilter.trim()) {
        params.set("action", auditActionFilter.trim());
      }

      if (auditUserFilter) {
        params.set("actor_id", auditUserFilter);
      }

      if (auditDateFrom) {
        params.set("date_from", auditDateFrom);
      }

      if (auditDateTo) {
        params.set("date_to", auditDateTo);
      }

      const query = params.toString();
      const response = await fetch(
        `/api/super-admin/audit-logs${query ? `?${query}` : ""}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load audit logs."
        );
      }

      setAuditLogs(data.logs ?? []);
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load audit logs."
      );
    } finally {
      setLoadingAuditLogs(false);
    }
  }

  function clearAuditFilters() {
    setAuditSearch("");
    setAuditActionFilter("");
    setAuditUserFilter("");
    setAuditDateFrom("");
    setAuditDateTo("");
  }

  const auditActions = useMemo(() => {
    return Array.from(
      new Set(
        auditLogs
          .map((log) => log.action)
          .filter(Boolean)
      )
    ).sort();
  }, [auditLogs]);

  const filteredAuditLogs = useMemo(() => {
    const normalizedSearch =
      auditSearch.trim().toLowerCase();

    return auditLogs.filter((log) => {
      if (!normalizedSearch) return true;

      const actorText = [
        log.actor?.full_name,
        log.actor?.username,
        log.actor?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      let detailsText = "";

      try {
        detailsText = JSON.stringify(log.details ?? {});
      } catch {
        detailsText = "";
      }

      const searchableText = [
        log.action,
        log.entity_type ?? "",
        log.entity_id ?? "",
        log.space_id ?? "",
        actorText,
        detailsText,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [auditLogs, auditSearch]);

  async function loadAdminTransactions() {
    try {
      setLoadingAdminTransactions(true);

      const params = new URLSearchParams();

      if (transactionSearch.trim()) {
        params.set("search", transactionSearch.trim());
      }

      if (transactionTypeFilter !== "all") {
        params.set("type", transactionTypeFilter);
      }

      if (transactionUserFilter) {
        params.set("user_id", transactionUserFilter);
      }

      if (transactionAccountFilter) {
        params.set("account_id", transactionAccountFilter);
      }

      if (transactionSpaceFilter) {
        params.set("space_id", transactionSpaceFilter);
      }

      if (transactionDateFrom) {
        params.set("date_from", transactionDateFrom);
      }

      if (transactionDateTo) {
        params.set("date_to", transactionDateTo);
      }

      if (transactionMinAmount.trim()) {
        params.set("min_amount", transactionMinAmount.trim());
      }

      if (transactionMaxAmount.trim()) {
        params.set("max_amount", transactionMaxAmount.trim());
      }

      const query = params.toString();
      const response = await fetch(
        `/api/super-admin/transactions${query ? `?${query}` : ""}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load Super Admin transactions."
        );
      }

      setAdminTransactions(data.transactions ?? []);

      setTransactionUsers(
        data.options?.users ?? []
      );

      setTransactionSpaces(
        data.options?.spaces ?? []
      );

      setTransactionAccounts(
        data.options?.accounts ?? []
      );

      setTransactionCategories(
        data.options?.categories ?? []
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load Super Admin transactions."
      );
    } finally {
      setLoadingAdminTransactions(false);
    }
  }

  function clearTransactionFilters() {
    setTransactionSearch("");
    setTransactionTypeFilter("all");
    setTransactionUserFilter("");
    setTransactionAccountFilter("");
    setTransactionSpaceFilter("");
    setTransactionDateFrom("");
    setTransactionDateTo("");
    setTransactionMinAmount("");
    setTransactionMaxAmount("");
  }

  const adminIncomeCount = useMemo(
    () =>
      adminTransactions.filter(
        (transaction) => transaction.type === "income"
      ).length,
    [adminTransactions]
  );

  const adminExpenseCount = useMemo(
    () =>
      adminTransactions.filter(
        (transaction) => transaction.type === "expense"
      ).length,
    [adminTransactions]
  );

  const adminTransferCount = useMemo(
    () =>
      adminTransactions.filter(
        (transaction) => transaction.type === "transfer"
      ).length,
    [adminTransactions]
  );

  function openCreateTransaction() {
    setSelectedAdminTransaction(null);
    setTransactionForm({
      user_id: "",
      space_id: "",
      account_id: "",
      category_id: "",
      type: "expense",
      amount: "",
      currency: "EGP",
      occurred_at: new Date().toISOString().slice(0, 16),
      description: "",
      payment_method: "",
      notes: "",
    });
    setShowTransactionModal(true);
  }

  function openEditTransaction(transaction: AdminTransaction) {
    setSelectedAdminTransaction(transaction);
    setTransactionForm({
      user_id: transaction.user_id ?? "",
      space_id: transaction.space_id,
      account_id: transaction.account_id,
      category_id: transaction.category_id ?? "",
      type: transaction.type,
      amount: String(transaction.amount ?? ""),
      currency: transaction.currency ?? "EGP",
      occurred_at: transaction.occurred_at
        ? new Date(transaction.occurred_at).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      description: transaction.description ?? "",
      payment_method: transaction.payment_method ?? "",
      notes: transaction.notes ?? "",
    });
    setShowTransactionModal(true);
  }

  function closeTransactionModal() {
    if (savingTransaction) return;
    setShowTransactionModal(false);
    setSelectedAdminTransaction(null);
  }

  async function saveAdminTransaction() {
    if (!transactionForm.user_id) {
      alert("Please select a user.");
      return;
    }

    if (!transactionForm.space_id) {
      alert("Please select a space.");
      return;
    }

    if (!transactionForm.account_id) {
      alert("Please select an account.");
      return;
    }

    const amount = Number(transactionForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Amount must be a positive number.");
      return;
    }

    if (!transactionForm.currency.trim()) {
      alert("Currency is required.");
      return;
    }

    if (!transactionForm.occurred_at) {
      alert("Date is required.");
      return;
    }

    try {
      setSavingTransaction(true);

      const isEdit = Boolean(selectedAdminTransaction);

      const payload = {
        user_id: transactionForm.user_id,
        space_id: transactionForm.space_id,
        account_id: transactionForm.account_id,
        category_id:
          transactionForm.category_id || null,
        type: transactionForm.type,
        amount,
        currency: transactionForm.currency
          .trim()
          .toUpperCase(),
        occurred_at: new Date(
          transactionForm.occurred_at
        ).toISOString(),
        description:
          transactionForm.description.trim() || null,
        payment_method:
          transactionForm.payment_method.trim() || null,
        notes:
          transactionForm.notes.trim() || null,
      };

      const response = await fetch(
        "/api/super-admin/transactions",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isEdit
              ? {
                  id: selectedAdminTransaction?.id,
                  ...payload,
                }
              : payload
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            (isEdit
              ? "Failed to update transaction."
              : "Failed to create transaction.")
        );
        return;
      }

      setShowTransactionModal(false);
      setSelectedAdminTransaction(null);
      await loadAdminTransactions();

      alert(
        isEdit
          ? "Transaction updated successfully."
          : "Transaction created successfully."
      );
    } catch (error) {
      console.error(error);
      alert(
        "Something went wrong while saving the transaction."
      );
    } finally {
      setSavingTransaction(false);
    }
  }

  async function deleteAdminTransaction(
    transaction: AdminTransaction
  ) {
    const label =
      transaction.description ||
      transaction.notes ||
      `${transaction.type} transaction`;

    const confirmed = confirm(
      `Delete "${label}" for ${transaction.user?.email || "this user"}?`
    );

    if (!confirmed) return;

    try {
      setSavingTransaction(true);

      const response = await fetch(
        "/api/super-admin/transactions",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: transaction.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            "Failed to delete transaction."
        );
        return;
      }

      await loadAdminTransactions();
      alert("Transaction deleted successfully.");
    } catch (error) {
      console.error(error);
      alert(
        "Something went wrong while deleting the transaction."
      );
    } finally {
      setSavingTransaction(false);
    }
  }

  // --------------------------------------------------
  // Super Admin budget management
  // --------------------------------------------------

  async function loadAdminBudgets() {
    try {
      setLoadingAdminBudgets(true);

      const params = new URLSearchParams();

      if (budgetSearch.trim()) {
        params.set("search", budgetSearch.trim());
      }

      if (budgetUserFilter) {
        params.set("user_id", budgetUserFilter);
      }

      if (budgetSpaceFilter) {
        params.set("space_id", budgetSpaceFilter);
      }

      if (budgetCategoryFilter) {
        params.set("category_id", budgetCategoryFilter);
      }

      if (budgetDateFrom) {
        params.set("date_from", budgetDateFrom);
      }

      if (budgetDateTo) {
        params.set("date_to", budgetDateTo);
      }

      if (budgetMinAmount.trim()) {
        params.set("min_amount", budgetMinAmount.trim());
      }

      if (budgetMaxAmount.trim()) {
        params.set("max_amount", budgetMaxAmount.trim());
      }

      const query = params.toString();

      const response = await fetch(
        `/api/super-admin/budgets${query ? `?${query}` : ""}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load Super Admin budgets."
        );
      }

      setAdminBudgets(data.budgets ?? []);

      setBudgetCategories(
        data.options?.categories ?? transactionCategories
      );
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load Super Admin budgets."
      );
    } finally {
      setLoadingAdminBudgets(false);
    }
  }

  function clearBudgetFilters() {
    setBudgetSearch("");
    setBudgetUserFilter("");
    setBudgetSpaceFilter("");
    setBudgetCategoryFilter("");
    setBudgetDateFrom("");
    setBudgetDateTo("");
    setBudgetMinAmount("");
    setBudgetMaxAmount("");
  }

  const adminBudgetTotal = useMemo(
    () =>
      adminBudgets.reduce(
        (total, budget) =>
          total + Number(budget.amount || 0),
        0
      ),
    [adminBudgets]
  );

  const adminBudgetSpent = useMemo(
    () =>
      adminBudgets.reduce(
        (total, budget) =>
          total + Number(budget.spent || 0),
        0
      ),
    [adminBudgets]
  );

  const adminBudgetRemaining = useMemo(
    () => adminBudgetTotal - adminBudgetSpent,
    [adminBudgetTotal, adminBudgetSpent]
  );

  function openCreateBudget() {
    setSelectedAdminBudget(null);
    setBudgetForm({
      user_id: "",
      space_id: "",
      category_id: "",
      name: "",
      amount: "",
      spent: "0",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    });
    setShowBudgetModal(true);
  }

  function openEditBudget(budget: AdminBudget) {
    setSelectedAdminBudget(budget);
    setBudgetForm({
      user_id: budget.user_id,
      space_id: budget.space_id,
      category_id: budget.category_id,
      name: budget.name,
      amount: String(budget.amount ?? ""),
      spent: String(budget.spent ?? 0),
      start_date: budget.start_date ?? "",
      end_date: budget.end_date ?? "",
    });
    setShowBudgetModal(true);
  }

  function closeBudgetModal() {
    if (savingBudget) return;
    setShowBudgetModal(false);
    setSelectedAdminBudget(null);
  }

  async function saveAdminBudget() {
    if (!budgetForm.user_id) {
      alert("Please select a user.");
      return;
    }

    if (!budgetForm.space_id) {
      alert("Please select a space.");
      return;
    }

    if (!budgetForm.category_id) {
      alert("Please select a category.");
      return;
    }

    if (!budgetForm.name.trim()) {
      alert("Budget name is required.");
      return;
    }

    const amount = Number(budgetForm.amount);
    const spent = Number(budgetForm.spent);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Budget amount must be a positive number.");
      return;
    }

    if (!Number.isFinite(spent) || spent < 0) {
      alert("Spent amount must be a valid non-negative number.");
      return;
    }

    if (spent > amount) {
      alert("Spent amount cannot exceed budget amount.");
      return;
    }

    if (!budgetForm.start_date || !budgetForm.end_date) {
      alert("Start date and end date are required.");
      return;
    }

    if (budgetForm.start_date > budgetForm.end_date) {
      alert("Start date cannot be later than end date.");
      return;
    }

    try {
      setSavingBudget(true);

      const isEdit = Boolean(selectedAdminBudget);

      const payload = {
        user_id: budgetForm.user_id,
        space_id: budgetForm.space_id,
        category_id: budgetForm.category_id,
        name: budgetForm.name.trim(),
        amount,
        spent,
        start_date: budgetForm.start_date,
        end_date: budgetForm.end_date,
      };

      const response = await fetch(
        "/api/super-admin/budgets",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isEdit
              ? {
                  id: selectedAdminBudget?.id,
                  ...payload,
                }
              : payload
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            (isEdit
              ? "Failed to update budget."
              : "Failed to create budget.")
        );
        return;
      }

      setShowBudgetModal(false);
      setSelectedAdminBudget(null);

      await loadAdminBudgets();

      alert(
        isEdit
          ? "Budget updated successfully."
          : "Budget created successfully."
      );
    } catch (error) {
      console.error(error);
      alert(
        "Something went wrong while saving the budget."
      );
    } finally {
      setSavingBudget(false);
    }
  }

  async function deleteAdminBudget(
    budget: AdminBudget
  ) {
    const confirmed = confirm(
      `Delete "${budget.name}" for ${
        budget.user?.email || "this user"
      }?`
    );

    if (!confirmed) return;

    try {
      setSavingBudget(true);

      const response = await fetch(
        `/api/super-admin/budgets?id=${encodeURIComponent(
          budget.id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            "Failed to delete budget."
        );
        return;
      }

      await loadAdminBudgets();

      alert("Budget deleted successfully.");
    } catch (error) {
      console.error(error);
      alert(
        "Something went wrong while deleting the budget."
      );
    } finally {
      setSavingBudget(false);
    }
  }

  // --------------------------------------------------
  // Super Admin savings management
  // --------------------------------------------------

  async function loadAdminSavings() {
    try {
      setLoadingAdminSavings(true);

      const params = new URLSearchParams();

      if (savingSearch.trim()) {
        params.set("search", savingSearch.trim());
      }
      if (savingUserFilter) {
        params.set("user_id", savingUserFilter);
      }
      if (savingSpaceFilter) {
        params.set("space_id", savingSpaceFilter);
      }
      if (savingDateFrom) {
        params.set("date_from", savingDateFrom);
      }
      if (savingDateTo) {
        params.set("date_to", savingDateTo);
      }
      if (savingMinAmount.trim()) {
        params.set("min_amount", savingMinAmount.trim());
      }
      if (savingMaxAmount.trim()) {
        params.set("max_amount", savingMaxAmount.trim());
      }

      const query = params.toString();
      const response = await fetch(
        `/api/super-admin/savings${query ? `?${query}` : ""}`,
        { method: "GET", cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load Super Admin savings."
        );
      }

      setAdminSavings(data.savings ?? []);
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load Super Admin savings."
      );
    } finally {
      setLoadingAdminSavings(false);
    }
  }

  function clearSavingFilters() {
    setSavingSearch("");
    setSavingUserFilter("");
    setSavingSpaceFilter("");
    setSavingDateFrom("");
    setSavingDateTo("");
    setSavingMinAmount("");
    setSavingMaxAmount("");
  }

  const adminSavingTargetTotal = useMemo(
    () =>
      adminSavings.reduce(
        (total, saving) =>
          total + Number(saving.target_amount || 0),
        0
      ),
    [adminSavings]
  );

  const adminSavingCurrentTotal = useMemo(
    () =>
      adminSavings.reduce(
        (total, saving) =>
          total + Number(saving.current_amount || 0),
        0
      ),
    [adminSavings]
  );

  const adminSavingRemainingTotal = useMemo(
    () =>
      adminSavingTargetTotal - adminSavingCurrentTotal,
    [adminSavingTargetTotal, adminSavingCurrentTotal]
  );

  function openCreateSavingGoal() {
    setSelectedAdminSaving(null);
    setSavingGoalForm({
      user_id: "",
      space_id: "",
      name: "",
      target_amount: "",
      current_amount: "0",
      deadline: new Date().toISOString().slice(0, 10),
    });
    setShowSavingModal(true);
  }

  function openEditSavingGoal(saving: AdminSaving) {
    setSelectedAdminSaving(saving);
    setSavingGoalForm({
      user_id: saving.user_id,
      space_id: saving.space_id,
      name: saving.name,
      target_amount: String(saving.target_amount ?? ""),
      current_amount: String(saving.current_amount ?? 0),
      deadline: saving.deadline ?? "",
    });
    setShowSavingModal(true);
  }

  function closeSavingModal() {
    if (savingGoalSaving) return;
    setShowSavingModal(false);
    setSelectedAdminSaving(null);
  }

  async function saveAdminSaving() {
    if (!savingGoalForm.user_id) {
      alert("Please select a user.");
      return;
    }
    if (!savingGoalForm.space_id) {
      alert("Please select a space.");
      return;
    }
    if (!savingGoalForm.name.trim()) {
      alert("Saving goal name is required.");
      return;
    }

    const targetAmount = Number(savingGoalForm.target_amount);
    const currentAmount = Number(savingGoalForm.current_amount);

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      alert("Target amount must be a positive number.");
      return;
    }
    if (!Number.isFinite(currentAmount) || currentAmount < 0) {
      alert("Current amount must be a valid non-negative number.");
      return;
    }
    if (currentAmount > targetAmount) {
      alert("Current amount cannot exceed target amount.");
      return;
    }
    if (!savingGoalForm.deadline) {
      alert("Deadline is required.");
      return;
    }

    try {
      setSavingGoalSaving(true);
      const isEdit = Boolean(selectedAdminSaving);

      const payload = {
        user_id: savingGoalForm.user_id,
        space_id: savingGoalForm.space_id,
        name: savingGoalForm.name.trim(),
        target_amount: targetAmount,
        current_amount: currentAmount,
        deadline: savingGoalForm.deadline,
      };

      const response = await fetch(
        "/api/super-admin/savings",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit
              ? { id: selectedAdminSaving?.id, ...payload }
              : payload
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            (isEdit
              ? "Failed to update saving goal."
              : "Failed to create saving goal.")
        );
        return;
      }

      setShowSavingModal(false);
      setSelectedAdminSaving(null);
      await loadAdminSavings();

      alert(
        isEdit
          ? "Saving goal updated successfully."
          : "Saving goal created successfully."
      );
    } catch (error) {
      console.error(error);
      alert(
        "Something went wrong while saving the saving goal."
      );
    } finally {
      setSavingGoalSaving(false);
    }
  }

  async function deleteAdminSaving(saving: AdminSaving) {
    const confirmed = confirm(
      `Delete "${saving.name}" for ${
        saving.user?.email || "this user"
      }?`
    );
    if (!confirmed) return;

    try {
      setSavingGoalSaving(true);

      const response = await fetch(
        `/api/super-admin/savings?id=${encodeURIComponent(saving.id)}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error || "Failed to delete saving goal."
        );
        return;
      }

      await loadAdminSavings();
      alert("Saving goal deleted successfully.");
    } catch (error) {
      console.error(error);
      alert(
        "Something went wrong while deleting the saving goal."
      );
    } finally {
      setSavingGoalSaving(false);
    }
  }

  // --------------------------------------------------
  // Refresh
  // --------------------------------------------------

  async function refreshAll() {
    try {
      setRefreshing(true);
      setError("");

      await Promise.all([
        loadUsers(),
        loadAccounts(),
        loadSpaces(),
        loadAdminTransactions(),
        loadAdminBudgets(),
        loadAdminSavings(),
        loadAdminCategories(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  // --------------------------------------------------
  // Role management
  // --------------------------------------------------

  function handleRoleChange(
    userId: string,
    role: EditableRole
  ) {
    setRoleChanges((prev) => ({
      ...prev,
      [userId]: role,
    }));
  }

  async function saveRole(userId: string) {
    const newRole = roleChanges[userId];

    if (!newRole) return;

    const currentUser = users.find(
      (user) => user.id === userId
    );

    if (!currentUser) return;

    if (userId === currentUserId) {
      alert(
        "You cannot change your own Super Admin role."
      );
      return;
    }

    if (currentUser.role === "super_admin") {
      return;
    }

    if (newRole === currentUser.role) {
      return;
    }

    const confirmed = confirm(
      `Change ${
        currentUser.full_name ||
        currentUser.email ||
        "this user"
      } role from "${currentUser.role}" to "${newRole}"?`
    );

    if (!confirmed) return;

    try {
      setSavingUserId(userId);

      const response = await fetch(
        `/api/super-admin/users/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "role",
            role: newRole,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            "Failed to update user role."
        );
        return;
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                role: newRole,
              }
            : user
        )
      );

      alert("User role updated successfully.");
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while updating the role."
      );
    } finally {
      setSavingUserId(null);
    }
  }

  // --------------------------------------------------
  // Disable / Enable user
  // --------------------------------------------------

  async function toggleUserStatus(user: User) {
    if (user.role === "super_admin") {
      alert(
        "Super Admin accounts are protected."
      );
      return;
    }

    if (user.id === currentUserId) {
      alert(
        "You cannot disable your own account."
      );
      return;
    }

    const nextStatus =
      user.status === "disabled"
        ? "active"
        : "disabled";

    const actionLabel =
      nextStatus === "disabled"
        ? "disable"
        : "enable";

    const confirmed = confirm(
      `Are you sure you want to ${actionLabel} "${user.full_name || user.email || "this user"}"?`
    );

    if (!confirmed) return;

    try {
      setSavingUserId(user.id);

      const response = await fetch(
        `/api/super-admin/users/${user.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "status",
            status: nextStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            `Failed to ${actionLabel} user.`
        );
        return;
      }

      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id
            ? {
                ...item,
                status: nextStatus,
              }
            : item
        )
      );

      alert(
        nextStatus === "disabled"
          ? "User disabled successfully."
          : "User enabled successfully."
      );
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while changing user status."
      );
    } finally {
      setSavingUserId(null);
    }
  }

  // --------------------------------------------------
  // User CRUD
  // --------------------------------------------------

  function openCreateUser() {
    setSelectedAdminUser(null);
    setUserForm({
      full_name: "",
      username: "",
      email: "",
      password: "",
      role: "user",
      language: "en",
      avatar_url: "",
    });
    setShowUserModal(true);
  }

  function openEditUser(user: User) {
    setSelectedAdminUser(user);
    setUserForm({
      full_name: user.full_name ?? "",
      username: user.username ?? "",
      email: user.email ?? "",
      password: "",
      role: user.role,
      language: user.language ?? "en",
      avatar_url: user.avatar_url ?? "",
    });
    setShowUserModal(true);
  }

  function closeUserModal() {
    if (savingUser) return;
    setShowUserModal(false);
    setSelectedAdminUser(null);
  }

  async function saveAdminUser() {
    const isEdit = Boolean(selectedAdminUser);

    if (!userForm.email.trim()) {
      alert("Email is required.");
      return;
    }

    if (!isEdit && userForm.password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    try {
      setSavingUser(true);

      const payload = {
        full_name: userForm.full_name.trim() || null,
        username: userForm.username.trim() || null,
        email: userForm.email.trim().toLowerCase(),
        role: userForm.role,
        language: userForm.language,
        avatar_url: userForm.avatar_url.trim() || null,
        ...(userForm.password
          ? { password: userForm.password }
          : {}),
      };

      const response = await fetch(
        isEdit
          ? `/api/super-admin/users/${selectedAdminUser?.id}`
          : "/api/super-admin/users",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isEdit
              ? {
                  action: "profile",
                  ...payload,
                }
              : payload
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            (isEdit
              ? "Failed to update user."
              : "Failed to create user.")
        );
        return;
      }

      setShowUserModal(false);
      setSelectedAdminUser(null);
      await loadUsers();

      alert(
        isEdit
          ? "User updated successfully."
          : "User created successfully."
      );
    } catch (error) {
      console.error(error);
      alert(
        isEdit
          ? "Something went wrong while updating the user."
          : "Something went wrong while creating the user."
      );
    } finally {
      setSavingUser(false);
    }
  }

  async function deleteAdminUser(user: User) {
    if (user.id === currentUserId) {
      alert("You cannot delete your own account.");
      return;
    }

    if (user.role === "super_admin") {
      alert("Super Admin accounts are protected.");
      return;
    }

    const confirmed = confirm(
      `Delete "${user.full_name || user.email || user.username || "this user"}" permanently?`
    );

    if (!confirmed) return;

    try {
      setSavingUser(true);

      const response = await fetch(
        `/api/super-admin/users/${user.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            "Failed to delete user."
        );
        return;
      }

      setUsers((prev) =>
        prev.filter((item) => item.id !== user.id)
      );

      alert("User deleted successfully.");
    } catch (error) {
      console.error(error);
      alert(
        "Something went wrong while deleting the user."
      );
    } finally {
      setSavingUser(false);
    }
  }

  // --------------------------------------------------
  // Account management
  // --------------------------------------------------

  async function loadAccountTransactions(
    accountId: string
  ) {
    try {
      setLoadingTransactions(true);
      setAccountTransactions([]);

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
            id,
            type,
            amount,
            currency,
            occurred_at,
            description,
            payment_method,
            notes,
            user_id,
            created_at
          `
        )
        .eq("account_id", accountId)
        .order("occurred_at", {
          ascending: false,
        })
        .limit(100);

      if (error) {
        console.error(
          "Account transactions loading error:",
          error
        );
        alert(
          error.message ||
            "Failed to load account transactions."
        );
        return;
      }

      setAccountTransactions(
        (data ?? []) as AccountTransaction[]
      );
    } catch (error) {
      console.error(error);
      alert(
        "Something went wrong while loading account transactions."
      );
    } finally {
      setLoadingTransactions(false);
    }
  }

  async function openViewAccount(account: Account) {
    setSelectedAccount(account);
    setAccountModalMode("view");
    await loadAccountTransactions(account.id);
  }

  function openEditAccount(account: Account) {
    setSelectedAccount(account);

    setAccountForm({
      name: account.name,
      type: account.type ?? "cash",
      currency: account.currency,
      opening_balance: String(
        account.opening_balance ?? 0
      ),
      description: account.description ?? "",
      owner_id: account.created_by ?? null,
    });

    setAccountModalMode("edit");
  }

  function openChangeOwner(account: Account) {
    setSelectedAccount(account);

    setAccountForm({
      name: account.name,
      type: account.type ?? "cash",
      currency: account.currency,
      opening_balance: String(
        account.opening_balance ?? 0
      ),
      description: account.description ?? "",
      owner_id: account.created_by ?? null,
    });

    setAccountModalMode("edit");
  }

  function closeAccountModal() {
    setSelectedAccount(null);
    setAccountModalMode(null);
    setAccountTransactions([]);
    setLoadingTransactions(false);
  }

  async function saveAccountChanges() {
    if (!selectedAccount) return;

    const openingBalance = Number(
      accountForm.opening_balance
    );

    if (
      !accountForm.name.trim() ||
      !accountForm.currency.trim()
    ) {
      alert(
        "Account name and currency are required."
      );
      return;
    }

    if (!Number.isFinite(openingBalance)) {
      alert(
        "Opening balance must be a valid number."
      );
      return;
    }

    try {
      setSavingAccountId(selectedAccount.id);

      const response = await fetch(
        `/api/super-admin/accounts/${selectedAccount.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: accountForm.name.trim(),
            type: accountForm.type.trim(),
            currency:
              accountForm.currency
                .trim()
                .toUpperCase(),
            opening_balance: openingBalance,
            description:
              accountForm.description.trim() ||
              null,
            owner_id: accountForm.owner_id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            "Failed to update account."
        );
        return;
      }

      const updatedOwner =
        data.account.created_by
          ? users.find(
              (user) =>
                user.id === data.account.created_by
            ) ?? null
          : null;

      const updatedAccount: Account = {
        ...selectedAccount,
        ...data.account,
        owner: updatedOwner
          ? {
              id: updatedOwner.id,
              name:
                updatedOwner.full_name ||
                updatedOwner.username ||
                updatedOwner.email ||
                "Unknown User",
              username: updatedOwner.username,
              email: updatedOwner.email,
            }
          : null,
      };

      setAccounts((prev) =>
        prev.map((account) =>
          account.id === selectedAccount.id
            ? updatedAccount
            : account
        )
      );

      setSelectedAccount(updatedAccount);
      setAccountModalMode("view");

      alert("Account updated successfully.");
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while updating the account."
      );
    } finally {
      setSavingAccountId(null);
    }
  }

  function openCreateAccount() {
    setNewAccountForm({
      name: "",
      type: "cash",
      currency: "EGP",
      opening_balance: "0",
      description: "",
      owner_id: users[0]?.id ?? "",
      space_id: spaces[0]?.id ?? "",
      is_archived: false,
    });
    setShowCreateAccountModal(true);
  }

  function closeCreateAccount() {
    if (creatingAccount) return;
    setShowCreateAccountModal(false);
  }

  async function createAccount() {
    const name = newAccountForm.name.trim();
    const type = newAccountForm.type.trim();
    const currency = newAccountForm.currency.trim().toUpperCase();
    const openingBalance = Number(newAccountForm.opening_balance);

    if (!name || !type || !currency) {
      alert("Account name, type, and currency are required.");
      return;
    }

    if (!newAccountForm.space_id) {
      alert("Please select a space.");
      return;
    }

    if (!newAccountForm.owner_id) {
      alert("Please select an owner.");
      return;
    }

    if (!Number.isFinite(openingBalance)) {
      alert("Opening balance must be a valid number.");
      return;
    }

    try {
      setCreatingAccount(true);

      const response = await fetch("/api/super-admin/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type,
          currency,
          opening_balance: openingBalance,
          description: newAccountForm.description.trim() || null,
          owner_id: newAccountForm.owner_id,
          space_id: newAccountForm.space_id,
          is_archived: newAccountForm.is_archived,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data?.error || "Failed to create account.");
        return;
      }

      await loadAccounts();
      setShowCreateAccountModal(false);
      alert("Account created successfully.");
    } catch (error) {
      console.error(error);
      alert("Something went wrong while creating the account.");
    } finally {
      setCreatingAccount(false);
    }
  }

  async function toggleArchiveAccount(
    account: Account
  ) {
    const nextArchived =
      !account.is_archived;

    const action = nextArchived
      ? "archive"
      : "restore";

    const confirmed = confirm(
      `Are you sure you want to ${action} "${account.name}"?`
    );

    if (!confirmed) return;

    try {
      setSavingAccountId(account.id);

      const response = await fetch(
        `/api/super-admin/accounts/${account.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_archived: nextArchived,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            "Failed to update account status."
        );
        return;
      }

      setAccounts((prev) =>
        prev.map((item) =>
          item.id === account.id
            ? data.account
            : item
        )
      );

      if (
        selectedAccount?.id === account.id
      ) {
        setSelectedAccount(data.account);
      }

      alert(
        nextArchived
          ? "Account archived successfully."
          : "Account restored successfully."
      );
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while changing account status."
      );
    } finally {
      setSavingAccountId(null);
    }
  }

  async function deleteAccount(account: Account) {
    const confirmed = confirm(
      `DELETE "${account.name}" permanently?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setSavingAccountId(account.id);

      const response = await fetch(
        `/api/super-admin/accounts/${account.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.error ||
            "Failed to delete account."
        );
        return;
      }

      setAccounts((prev) =>
        prev.filter(
          (item) => item.id !== account.id
        )
      );

      if (
        selectedAccount?.id === account.id
      ) {
        closeAccountModal();
      }

      alert("Account deleted successfully.");
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while deleting the account."
      );
    } finally {
      setSavingAccountId(null);
    }
  }

  // --------------------------------------------------
  // User search + role filter
  // --------------------------------------------------

  const filteredUsers = useMemo(() => {
    const normalizedSearch =
      userSearch.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        user.full_name
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        user.username
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        user.email
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesRole =
        roleFilter === "all" ||
        user.role === roleFilter;

      return Boolean(
        matchesSearch && matchesRole
      );
    });
  }, [users, userSearch, roleFilter]);

  const administratorCount = useMemo(
    () =>
      users.filter(
        (user) =>
          user.role === "admin" ||
          user.role === "super_admin"
      ).length,
    [users]
  );

  const activeAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => !account.is_archived
      ).length,
    [accounts]
  );

  const archivedAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.is_archived
      ).length,
    [accounts]
  );

  const totalOpeningBalance = useMemo(
    () =>
      accounts.reduce(
        (total, account) =>
          total +
          Number(
            account.opening_balance || 0
          ),
        0
      ),
    [accounts]
  );

  const totalSpaceMembers = useMemo(
    () =>
      spaces.reduce(
        (total, space) =>
          total + Number(space.members_count || 0),
        0
      ),
    [spaces]
  );

  const personalSpaces = useMemo(
    () =>
      spaces.filter(
        (space) => space.type === "personal"
      ).length,
    [spaces]
  );

  const teamSpaces = useMemo(
    () =>
      spaces.filter(
        (space) => space.type !== "personal"
      ).length,
    [spaces]
  );

  // --------------------------------------------------
  // Access loading
  // --------------------------------------------------

  if (accessChecking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-8 py-6 text-center">
          <div className="text-xl font-semibold text-white">
            Checking permissions...
          </div>

          <div className="text-slate-400 mt-2">
            Verifying Super Admin access.
          </div>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">

        <div>
          <h1 className="text-4xl font-bold">
            Super Admin
          </h1>

          <p className="text-slate-400 mt-2">
            Manage users, permissions and financial
            accounts from one place.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshAll}
          disabled={refreshing}
          className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 transition font-semibold"
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4">
          {error}
        </div>
      )}

      {/* Main Stats */}
      <div className="grid md:grid-cols-4 gap-6">

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
          <p className="text-slate-400">
            Total Users
          </p>

          <h2 className="text-4xl font-bold mt-3 text-blue-400">
            {loadingUsers ? "..." : users.length}
          </h2>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
          <p className="text-slate-400">
            Administrators
          </p>

          <h2 className="text-4xl font-bold mt-3 text-purple-400">
            {loadingUsers
              ? "..."
              : administratorCount}
          </h2>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
          <p className="text-slate-400">
            Total Accounts
          </p>

          <h2 className="text-4xl font-bold mt-3 text-cyan-400">
            {loadingAccounts
              ? "..."
              : accounts.length}
          </h2>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
          <p className="text-slate-400">
            Active Accounts
          </p>

          <h2 className="text-4xl font-bold mt-3 text-green-400">
            {loadingAccounts
              ? "..."
              : activeAccounts}
          </h2>
        </div>

      </div>

      {/* Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex gap-2">

        <button
          type="button"
          onClick={() =>
            setActiveTab("users")
          }
          className={`flex-1 py-3 rounded-xl font-semibold transition ${
            activeTab === "users"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          Users Management
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab("accounts")
          }
          className={`flex-1 py-3 rounded-xl font-semibold transition ${
            activeTab === "accounts"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          Accounts Management
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab("spaces")
          }
          className={`flex-1 py-3 rounded-xl font-semibold transition ${
            activeTab === "spaces"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          Spaces Management
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab("budgets")
          }
          className={`flex-1 py-3 rounded-xl font-semibold transition ${
            activeTab === "budgets"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          Budgets Management
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab("savings")
          }
          className={`flex-1 py-3 rounded-xl font-semibold transition ${
            activeTab === "savings"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          Savings Management
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab("categories")
          }
          className={`flex-1 py-3 rounded-xl font-semibold transition ${
            activeTab === "categories"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          Categories Management
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab("transactions")
          }
          className={`flex-1 py-3 rounded-xl font-semibold transition ${
            activeTab === "transactions"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          Transactions Management
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab("audit")
          }
          className={`flex-1 py-3 rounded-xl font-semibold transition ${
            activeTab === "audit"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          Audit Logs
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab("login_activity")
          }
          className={`flex-1 py-3 rounded-xl font-semibold transition ${
            activeTab === "login_activity"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          Login Activity
        </button>

      </div>

      {/* Users */}
      {activeTab === "users" && (
        <div className="space-y-6">

          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">

            <div className="p-6 border-b border-slate-800 space-y-5">

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    Users
                  </h2>

                  <p className="text-slate-400 mt-1">
                    Search, filter and manage system
                    users.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateUser}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition font-semibold"
                >
                  + Add User
                </button>
              </div>

              {/* Search + Filter */}
              <div className="grid md:grid-cols-[1fr_220px] gap-4">

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Search
                  </label>

                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) =>
                      setUserSearch(
                        e.target.value
                      )
                    }
                    placeholder="Search by name, username or email..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Role
                  </label>

                  <select
                    value={roleFilter}
                    onChange={(e) =>
                      setRoleFilter(
                        e.target
                          .value as RoleFilter
                      )
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="all">
                      All Roles
                    </option>

                    <option value="user">
                      User
                    </option>

                    <option value="admin">
                      Admin
                    </option>

                    <option value="super_admin">
                      Super Admin
                    </option>
                  </select>
                </div>

              </div>

              {/* Filter summary */}
              <div className="flex flex-wrap items-center justify-between gap-3">

                <p className="text-sm text-slate-400">
                  Showing{" "}
                  <span className="text-white font-semibold">
                    {filteredUsers.length}
                  </span>{" "}
                  of{" "}
                  <span className="text-white font-semibold">
                    {users.length}
                  </span>{" "}
                  users
                </p>

                {(userSearch ||
                  roleFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserSearch("");
                      setRoleFilter("all");
                    }}
                    className="text-sm text-blue-400 hover:text-blue-300 transition"
                  >
                    Clear filters
                  </button>
                )}

              </div>

            </div>

            {loadingUsers ? (
              <div className="p-8 text-center text-slate-400">
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No users found.
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-10 text-center">

                <div className="text-4xl mb-3">
                  🔎
                </div>

                <p className="text-lg font-semibold text-white">
                  No matching users
                </p>

                <p className="text-slate-400 mt-1">
                  Try a different search term or
                  role filter.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setUserSearch("");
                    setRoleFilter("all");
                  }}
                  className="mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition font-semibold"
                >
                  Clear Filters
                </button>

              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-slate-800">
                    <tr>

                      <th className="p-4 text-left">
                        User
                      </th>

                      <th className="p-4 text-left">
                        Email
                      </th>

                      <th className="p-4 text-left">
                        Current Role
                      </th>

                      <th className="p-4 text-left">
                        Change Role
                      </th>

                      <th className="p-4 text-left">
                        Status
                      </th>

                      <th className="p-4 text-left">
                        Actions
                      </th>

                      <th className="p-4 text-left">
                        Language
                      </th>

                      <th className="p-4 text-left">
                        Created
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {filteredUsers.map((user) => {

                      const isCurrentUser =
                        user.id ===
                        currentUserId;

                      const isSuperAdmin =
                        user.role ===
                        "super_admin";

                      const isSaving =
                        savingUserId ===
                        user.id;

                      const selectedRole =
                        roleChanges[user.id] ??
                        (user.role === "admin"
                          ? "admin"
                          : "user");

                      const roleClass =
                        user.role ===
                        "super_admin"
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          : user.role === "admin"
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-green-500/20 text-green-400 border border-green-500/30";

                      const statusClass =
                        user.status ===
                        "disabled"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-green-500/20 text-green-400 border border-green-500/30";

                      return (
                        <tr
                          key={user.id}
                          className="border-t border-slate-800 hover:bg-slate-800/40 transition"
                        >

                          {/* User */}
                          <td className="p-4">

                            <div>

                              <p className="font-semibold">
                                {user.full_name ||
                                  "No name"}
                              </p>

                              <p className="text-sm text-slate-400">
                                {user.username ||
                                  "-"}
                              </p>

                              {isCurrentUser && (
                                <span className="inline-block mt-1 text-xs text-blue-400">
                                  You
                                </span>
                              )}

                            </div>

                          </td>

                          {/* Email */}
                          <td className="p-4 text-slate-300">
                            {user.email || "-"}
                          </td>

                          {/* Role */}
                          <td className="p-4">

                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${roleClass}`}
                            >
                              {user.role
                                .replace("_", " ")
                                .replace(
                                  /\b\w/g,
                                  (char) =>
                                    char.toUpperCase()
                                )}
                            </span>

                          </td>

                          {/* Change Role */}
                          <td className="p-4">

                            {isSuperAdmin ? (
                              <span className="text-slate-500 text-sm">
                                Protected
                              </span>
                            ) : (
                              <div className="flex items-center gap-3">

                                <select
                                  value={
                                    selectedRole
                                  }
                                  onChange={(e) =>
                                    handleRoleChange(
                                      user.id,
                                      e.target
                                        .value as EditableRole
                                    )
                                  }
                                  disabled={
                                    isSaving
                                  }
                                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                                >
                                  <option value="user">
                                    User
                                  </option>

                                  <option value="admin">
                                    Admin
                                  </option>
                                </select>

                                <button
                                  type="button"
                                  onClick={() =>
                                    saveRole(
                                      user.id
                                    )
                                  }
                                  disabled={
                                    isSaving ||
                                    selectedRole ===
                                      user.role
                                  }
                                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
                                >
                                  {savingUserId ===
                                  user.id
                                    ? "Saving..."
                                    : "Save"}
                                </button>

                              </div>
                            )}

                          </td>

                          {/* Status */}
                          <td className="p-4">

                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${statusClass}`}
                            >
                              {user.status ===
                              "disabled"
                                ? "Disabled"
                                : "Active"}
                            </span>

                          </td>

                          {/* Status action */}
                          <td className="p-4">

                            {isSuperAdmin ? (
                              <span className="text-slate-500 text-sm">
                                Protected
                              </span>
                            ) : isCurrentUser ? (
                              <span className="text-slate-500 text-sm">
                                Current account
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  toggleUserStatus(
                                    user
                                  )
                                }
                                disabled={isSaving}
                                className={`px-4 py-2 rounded-lg disabled:opacity-40 transition font-semibold text-sm ${
                                  user.status ===
                                  "disabled"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-red-600 hover:bg-red-700"
                                }`}
                              >
                                {isSaving
                                  ? "..."
                                  : user.status ===
                                    "disabled"
                                  ? "Enable"
                                  : "Disable"}
                              </button>
                            )}

                          </td>

                          {/* User actions */}
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2">
                              {isSuperAdmin ? (
                                <span className="text-slate-500 text-sm">
                                  Protected
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditUser(user)
                                    }
                                    disabled={isSaving}
                                    className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition font-semibold text-sm"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteAdminUser(user)
                                    }
                                    disabled={isSaving || isCurrentUser}
                                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 transition font-semibold text-sm"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Language */}
                          <td className="p-4 text-slate-300">
                            {user.language ===
                            "ar"
                              ? "Arabic"
                              : "English"}
                          </td>

                          {/* Created */}
                          <td className="p-4 text-slate-300">
                            {user.created_at
                              ? new Date(
                                  user.created_at
                                ).toLocaleDateString()
                              : "-"}
                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>
            )}

          </div>

        </div>
      )}

      {/* Spaces */}
      {activeTab === "spaces" && (
        <div className="space-y-6">

          {/* Space Stats */}
          <div className="grid md:grid-cols-4 gap-6">

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">
                Total Spaces
              </p>
              <h2 className="text-3xl font-bold mt-3 text-blue-400">
                {loadingSpaces ? "..." : spaces.length}
              </h2>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">
                Personal Spaces
              </p>
              <h2 className="text-3xl font-bold mt-3 text-cyan-400">
                {loadingSpaces ? "..." : personalSpaces}
              </h2>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">
                Other Spaces
              </p>
              <h2 className="text-3xl font-bold mt-3 text-purple-400">
                {loadingSpaces ? "..." : teamSpaces}
              </h2>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">
                Total Members
              </p>
              <h2 className="text-3xl font-bold mt-3 text-green-400">
                {loadingSpaces ? "..." : totalSpaceMembers}
              </h2>
            </div>

          </div>

          {/* Spaces Table */}
          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">

            <div className="p-6 border-b border-slate-800">
              <h2 className="text-2xl font-bold">
                All Spaces
              </h2>

              <p className="text-slate-400 mt-1">
                View spaces, owners, members and accounts across the entire system.
              </p>
            </div>

            {loadingSpaces ? (
              <div className="p-8 text-center text-slate-400">
                Loading spaces...
              </div>
            ) : spaces.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No spaces found.
              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-[980px]">

                  <thead className="bg-slate-800">
                    <tr>
                      <th className="p-4 text-left">
                        Space
                      </th>
                      <th className="p-4 text-left">
                        Actions
                      </th>

                      <th className="p-4 text-left">
                        Type
                      </th>

                      <th className="p-4 text-left">
                        Currency
                      </th>

                      <th className="p-4 text-left">
                        Owner
                      </th>

                      <th className="p-4 text-left">
                        Members
                      </th>

                      <th className="p-4 text-left">
                        Accounts
                      </th>

                      <th className="p-4 text-left">
                        Created
                      </th>

                      <th className="p-4 text-left">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {spaces.map((space) => (
                      <tr
                        key={space.id}
                        className="border-t border-slate-800 hover:bg-slate-800/40 transition"
                      >
                        <td className="p-4">
                          <p className="font-semibold text-white">
                            {space.name}
                          </p>

                          <p className="text-xs text-slate-500 mt-1 break-all">
                            {space.id}
                          </p>
                        </td>

                        <td className="p-4 text-slate-300">
                          <span className="inline-flex px-3 py-1 rounded-full text-sm font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                            {space.type}
                          </span>
                        </td>

                        <td className="p-4 text-slate-300">
                          {space.base_currency}
                        </td>

                        <td className="p-4">
                          <p className="font-semibold text-white">
                            {space.owner?.name ||
                              space.owner?.email ||
                              "Unknown User"}
                          </p>

                          {space.owner?.email && (
                            <p className="text-xs text-slate-400 mt-1">
                              {space.owner.email}
                            </p>
                          )}
                        </td>

                        <td className="p-4 font-semibold text-green-400">
                          {space.members_count}
                        </td>

                        <td className="p-4 font-semibold text-cyan-400">
                          {space.accounts_count}
                        </td>

                        <td className="p-4 text-slate-300 whitespace-nowrap">
                          {space.created_at
                            ? new Date(
                                space.created_at
                              ).toLocaleDateString()
                            : "-"}
                        </td>

                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() =>
                              openSpaceDetails(space)
                            }
                            disabled={loadingSpaceDetails}
                            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition text-sm font-semibold"
                          >
                            {loadingSpaceDetails
                              ? "Loading..."
                              : "View Details"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Accounts */}
      {activeTab === "accounts" && (
        <div className="space-y-6">

          {/* Account Stats */}
          <div className="grid md:grid-cols-3 gap-6">

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">
                Active Accounts
              </p>

              <h2 className="text-3xl font-bold mt-3 text-green-400">
                {loadingAccounts
                  ? "..."
                  : activeAccounts}
              </h2>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">
                Archived Accounts
              </p>

              <h2 className="text-3xl font-bold mt-3 text-yellow-400">
                {loadingAccounts
                  ? "..."
                  : archivedAccounts}
              </h2>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">
                Total Opening Balance
              </p>

              <h2 className="text-3xl font-bold mt-3 text-cyan-400">
                {loadingAccounts
                  ? "..."
                  : `${totalOpeningBalance.toFixed(
                      2
                    )} EGP`}
              </h2>
            </div>

          </div>

          {/* Accounts Table */}
          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">

            <div className="p-6 border-b border-slate-800">

              <h2 className="text-2xl font-bold">
                All Accounts
              </h2>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    All Accounts
                  </h2>

                  <p className="text-slate-400 mt-1">
                    Full control over accounts across the entire system.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateAccount}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition font-semibold whitespace-nowrap"
                >
                  + Add Account
                </button>
              </div>

            </div>

            {loadingAccounts ? (
              <div className="p-8 text-center text-slate-400">
                Loading accounts...
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No accounts found.
              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-slate-800">
                    <tr>

                      <th className="p-4 text-left">
                        Account
                      </th>

                      <th className="p-4 text-left">
                        Type
                      </th>

                      <th className="p-4 text-left">
                        Currency
                      </th>

                      <th className="p-4 text-left">
                        Owner
                      </th>

                      <th className="p-4 text-left">
                        Opening Balance
                      </th>

                      <th className="p-4 text-left">
                        Current Balance
                      </th>

                      <th className="p-4 text-left">
                        Transactions
                      </th>

                      <th className="p-4 text-left">
                        Status
                      </th>

                      <th className="p-4 text-left">
                        Actions
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {accounts.map((account) => {

                      const isSaving =
                        savingAccountId ===
                        account.id;

                      return (
                        <tr
                          key={account.id}
                          className="border-t border-slate-800 hover:bg-slate-800/40 transition"
                        >

                          <td className="p-4">

                            <p className="font-semibold">
                              {account.name}
                            </p>

                            {account.description && (
                              <p className="text-sm text-slate-400 mt-1 max-w-xs truncate">
                                {account.description}
                              </p>
                            )}

                          </td>

                          <td className="p-4 text-slate-300">
                            {String(
                              account.type
                            )}
                          </td>

                          <td className="p-4 text-slate-300">
                            {account.currency}
                          </td>

                          <td className="p-4">
                            <div>
                              <p className="font-semibold text-white">
                                {account.owner?.name ||
                                  "Unknown User"}
                              </p>

                              {account.owner?.email && (
                                <p className="text-xs text-slate-400 mt-1">
                                  {account.owner.email}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="p-4 font-bold text-slate-200">
                            {Number(
                              account.opening_balance ||
                                0
                            ).toFixed(2)}{" "}
                            {account.currency}
                          </td>

                          <td className="p-4 font-bold text-cyan-400">
                            {Number(
                              account.current_balance ||
                                0
                            ).toFixed(2)}{" "}
                            {account.currency}
                          </td>

                          <td className="p-4">
                            <div>
                              <p className="font-semibold text-white">
                                {account.transactions_count}
                              </p>

                              <p className="text-xs text-slate-500 mt-1">
                                {Number(account.total_income || 0).toFixed(2)} in / {Number(account.total_expenses || 0).toFixed(2)} out
                              </p>
                            </div>
                          </td>

                          <td className="p-4">

                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                                account.is_archived
                                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                  : "bg-green-500/20 text-green-400 border border-green-500/30"
                              }`}
                            >
                              {account.is_archived
                                ? "Archived"
                                : "Active"}
                            </span>

                          </td>

                          <td className="p-4">

                            <div className="flex flex-wrap gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  openViewAccount(
                                    account
                                  )
                                }
                                className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition text-sm font-semibold"
                              >
                                View
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEditAccount(
                                    account
                                  )
                                }
                                disabled={isSaving}
                                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition text-sm font-semibold"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openChangeOwner(
                                    account
                                  )
                                }
                                disabled={isSaving}
                                className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 transition text-sm font-semibold"
                              >
                                Change Owner
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleArchiveAccount(
                                    account
                                  )
                                }
                                disabled={isSaving}
                                className="px-3 py-2 rounded-lg bg-yellow-600/90 hover:bg-yellow-600 disabled:opacity-40 transition text-sm font-semibold"
                              >
                                {isSaving
                                  ? "..."
                                  : account.is_archived
                                  ? "Restore"
                                  : "Archive"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteAccount(
                                    account
                                  )
                                }
                                disabled={isSaving}
                                className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 transition text-sm font-semibold"
                              >
                                Delete
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>
            )}

          </div>

        </div>
      )}

      {/* Budgets */}
      {activeTab === "budgets" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">Budgets in View</p>
              <h2 className="text-3xl font-bold mt-3 text-blue-400">
                {loadingAdminBudgets ? "..." : adminBudgets.length}
              </h2>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">Total Budget</p>
              <h2 className="text-3xl font-bold mt-3 text-cyan-400">
                {loadingAdminBudgets
                  ? "..."
                  : adminBudgetTotal.toFixed(2)}
              </h2>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">Total Spent</p>
              <h2 className="text-3xl font-bold mt-3 text-red-400">
                {loadingAdminBudgets
                  ? "..."
                  : adminBudgetSpent.toFixed(2)}
              </h2>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">Remaining</p>
              <h2 className="text-3xl font-bold mt-3 text-green-400">
                {loadingAdminBudgets
                  ? "..."
                  : adminBudgetRemaining.toFixed(2)}
              </h2>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
            <div className="p-6 border-b border-slate-800 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    Budgets
                  </h2>
                  <p className="text-slate-400 mt-1">
                    Full control over budgets across the entire system.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateBudget}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition font-semibold whitespace-nowrap"
                >
                  + Add Budget
                </button>
              </div>

              <div className="grid lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    value={budgetSearch}
                    onChange={(event) =>
                      setBudgetSearch(event.target.value)
                    }
                    placeholder="Budget, user, space, category..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    User
                  </label>
                  <select
                    value={budgetUserFilter}
                    onChange={(event) =>
                      setBudgetUserFilter(event.target.value)
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">All Users</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name ||
                          user.username ||
                          user.email ||
                          user.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Space
                  </label>
                  <select
                    value={budgetSpaceFilter}
                    onChange={(event) =>
                      setBudgetSpaceFilter(event.target.value)
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">All Spaces</option>
                    {spaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Category
                  </label>
                  <select
                    value={budgetCategoryFilter}
                    onChange={(event) =>
                      setBudgetCategoryFilter(event.target.value)
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {budgetCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Date From
                    </label>
                    <input
                      type="date"
                      value={budgetDateFrom}
                      onChange={(event) =>
                        setBudgetDateFrom(event.target.value)
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Date To
                    </label>
                    <input
                      type="date"
                      value={budgetDateTo}
                      onChange={(event) =>
                        setBudgetDateTo(event.target.value)
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Minimum Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgetMinAmount}
                    onChange={(event) =>
                      setBudgetMinAmount(event.target.value)
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Maximum Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgetMaxAmount}
                    onChange={(event) =>
                      setBudgetMaxAmount(event.target.value)
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-end gap-3">
                  <button
                    type="button"
                    onClick={clearBudgetFilters}
                    className="px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition font-semibold"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={loadAdminBudgets}
                    disabled={loadingAdminBudgets}
                    className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition font-semibold"
                  >
                    {loadingAdminBudgets
                      ? "Loading..."
                      : "Apply"}
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-400">
                Showing{" "}
                <span className="text-white font-semibold">
                  {adminBudgets.length}
                </span>{" "}
                budgets
              </p>
            </div>

            {loadingAdminBudgets ? (
              <div className="p-8 text-center text-slate-400">
                Loading budgets...
              </div>
            ) : adminBudgets.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-lg font-semibold text-white">
                  No budgets found
                </p>
                <p className="text-slate-400 mt-1">
                  Try changing the filters or add a new budget.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1450px]">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="p-4 text-left">Budget</th>
                      <th className="p-4 text-left">User</th>
                      <th className="p-4 text-left">Space</th>
                      <th className="p-4 text-left">Category</th>
                      <th className="p-4 text-left">Amount</th>
                      <th className="p-4 text-left">Spent</th>
                      <th className="p-4 text-left">Remaining</th>
                      <th className="p-4 text-left">Period</th>
                      <th className="p-4 text-left">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {adminBudgets.map((budget) => {
                      const amount = Number(budget.amount || 0);
                      const spent = Number(budget.spent || 0);
                      const remaining = amount - spent;

                      return (
                        <tr
                          key={budget.id}
                          className="border-t border-slate-800 hover:bg-slate-800/40 transition"
                        >
                          <td className="p-4">
                            <p className="font-semibold text-white">
                              {budget.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 break-all">
                              {budget.id}
                            </p>
                          </td>

                          <td className="p-4">
                            <p className="font-semibold text-white">
                              {budget.user?.full_name ||
                                budget.user?.username ||
                                budget.user?.email ||
                                "Unknown User"}
                            </p>
                            {budget.user?.email && (
                              <p className="text-xs text-slate-500 mt-1">
                                {budget.user.email}
                              </p>
                            )}
                          </td>

                          <td className="p-4">
                            {budget.space?.name || "Unknown Space"}
                          </td>

                          <td className="p-4">
                            {budget.category?.name || "Unknown Category"}
                          </td>

                          <td className="p-4 font-semibold text-cyan-400">
                            {amount.toFixed(2)}
                          </td>

                          <td className="p-4 font-semibold text-red-400">
                            {spent.toFixed(2)}
                          </td>

                          <td className={`p-4 font-semibold ${
                            remaining >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}>
                            {remaining.toFixed(2)}
                          </td>

                          <td className="p-4 text-sm text-slate-300 whitespace-nowrap">
                            {budget.start_date} → {budget.end_date}
                          </td>

                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditBudget(budget)
                                }
                                disabled={savingBudget}
                                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition text-sm font-semibold"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteAdminBudget(budget)
                                }
                                disabled={savingBudget}
                                className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 transition text-sm font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">Categories in View</p>
              <h2 className="text-3xl font-bold mt-3 text-blue-400">
                {loadingAdminCategories ? "..." : adminCategories.length}
              </h2>
            </div>
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">System Categories</p>
              <h2 className="text-3xl font-bold mt-3 text-purple-400">
                {loadingAdminCategories
                  ? "..."
                  : adminCategories.filter((category) => category.is_system).length}
              </h2>
            </div>
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">Custom Categories</p>
              <h2 className="text-3xl font-bold mt-3 text-green-400">
                {loadingAdminCategories
                  ? "..."
                  : adminCategories.filter((category) => !category.is_system).length}
              </h2>
            </div>
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">Spaces Covered</p>
              <h2 className="text-3xl font-bold mt-3 text-cyan-400">
                {loadingAdminCategories
                  ? "..."
                  : new Set(adminCategories.map((category) => category.space_id)).size}
              </h2>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
            <div className="p-6 border-b border-slate-800 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Categories</h2>
                  <p className="text-slate-400 mt-1">
                    Full control over categories across every space.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateCategory}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition font-semibold whitespace-nowrap"
                >
                  + Add Category
                </button>
              </div>

              <div className="grid lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(event) =>
                      setCategorySearch(event.target.value)
                    }
                    placeholder="Name, kind, icon, space..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Space
                  </label>
                  <select
                    value={categorySpaceFilter}
                    onChange={(event) =>
                      setCategorySpaceFilter(event.target.value)
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">All Spaces</option>
                    {spaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Kind
                  </label>
                  <input
                    type="text"
                    value={categoryKindFilter}
                    onChange={(event) =>
                      setCategoryKindFilter(event.target.value)
                    }
                    placeholder="expense, income..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-400">
                  Showing <span className="text-white font-semibold">{adminCategories.length}</span> categories
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={clearCategoryFilters}
                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition font-semibold"
                  >
                    Clear Filters
                  </button>

                  <button
                    type="button"
                    onClick={loadAdminCategories}
                    disabled={loadingAdminCategories}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition font-semibold"
                  >
                    {loadingAdminCategories ? "Loading..." : "Apply Filters"}
                  </button>
                </div>
              </div>
            </div>

            {loadingAdminCategories ? (
              <div className="p-10 text-center text-slate-400">
                Loading categories...
              </div>
            ) : adminCategories.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                No categories found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead className="bg-slate-800/70">
                    <tr>
                      <th className="p-4 text-left">Category</th>
                      <th className="p-4 text-left">Space</th>
                      <th className="p-4 text-left">Kind</th>
                      <th className="p-4 text-left">Icon</th>
                      <th className="p-4 text-left">System</th>
                      <th className="p-4 text-left">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {adminCategories.map((category) => (
                      <tr
                        key={category.id}
                        className="border-t border-slate-800 hover:bg-slate-800/40 transition"
                      >
                        <td className="p-4">
                          <p className="font-semibold text-white">
                            {category.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-1 break-all">
                            {category.id}
                          </p>
                        </td>

                        <td className="p-4">
                          <p className="font-semibold text-white">
                            {category.space?.name || "Unknown Space"}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {category.space?.type || "-"}
                          </p>
                        </td>

                        <td className="p-4">
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                            {category.kind}
                          </span>
                        </td>

                        <td className="p-4 text-slate-300">
                          {category.icon || "-"}
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                              category.is_system
                                ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                                : "bg-green-500/15 text-green-400 border border-green-500/20"
                            }`}
                          >
                            {category.is_system ? "System" : "Custom"}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditCategory(category)
                              }
                              disabled={savingCategory}
                              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition text-sm font-semibold"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteAdminCategory(category)
                              }
                              disabled={savingCategory}
                              className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 transition text-sm font-semibold"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div
          className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4"
          onClick={closeCategoryModal}
        >
          <div
            className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h3 className="text-2xl font-bold">
                  {selectedAdminCategory
                    ? "Edit Category"
                    : "Add Category"}
                </h3>
                <p className="text-slate-400 mt-1">
                  Manage every category field as Super Admin.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCategoryModal}
                disabled={savingCategory}
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xl transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Space
                </label>
                <select
                  value={categoryForm.space_id}
                  onChange={(event) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      space_id: event.target.value,
                    }))
                  }
                  disabled={savingCategory}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">Select Space</option>
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name} — {space.type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  disabled={savingCategory}
                  placeholder="Food"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Kind
                </label>
                <input
                  type="text"
                  value={categoryForm.kind}
                  onChange={(event) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      kind: event.target.value,
                    }))
                  }
                  disabled={savingCategory}
                  placeholder="expense"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Icon
                </label>
                <input
                  type="text"
                  value={categoryForm.icon}
                  onChange={(event) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      icon: event.target.value,
                    }))
                  }
                  disabled={savingCategory}
                  placeholder="🍔"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <label className="flex items-center gap-3 bg-slate-800/70 border border-slate-700 rounded-xl p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={categoryForm.is_system}
                  onChange={(event) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      is_system: event.target.checked,
                    }))
                  }
                  disabled={savingCategory}
                  className="w-5 h-5"
                />
                <span>
                  <span className="block font-semibold text-white">
                    System Category
                  </span>
                  <span className="block text-sm text-slate-400 mt-1">
                    Mark this category as a system-level category.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-800">
              <button
                type="button"
                onClick={closeCategoryModal}
                disabled={savingCategory}
                className="px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 transition font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveAdminCategory}
                disabled={savingCategory}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition font-semibold"
              >
                {savingCategory
                  ? "Saving..."
                  : selectedAdminCategory
                  ? "Save Changes"
                  : "Create Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions */}
      {activeTab === "transactions" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">
                Transactions in View
              </p>
              <h2 className="text-3xl font-bold mt-3 text-blue-400">
                {loadingAdminTransactions ? "..." : adminTransactions.length}
              </h2>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">
                Income Transactions
              </p>
              <h2 className="text-3xl font-bold mt-3 text-green-400">
                {loadingAdminTransactions ? "..." : adminIncomeCount}
              </h2>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">
                Expense Transactions
              </p>
              <h2 className="text-3xl font-bold mt-3 text-red-400">
                {loadingAdminTransactions ? "..." : adminExpenseCount}
              </h2>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">
                Transfer Transactions
              </p>
              <h2 className="text-3xl font-bold mt-3 text-cyan-400">
                {loadingAdminTransactions ? "..." : adminTransferCount}
              </h2>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
            <div className="p-6 border-b border-slate-800 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    Transactions
                  </h2>
                  <p className="text-slate-400 mt-1">
                    Full control over transactions across the entire system.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateTransaction}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition font-semibold whitespace-nowrap"
                >
                  + Add Transaction
                </button>
              </div>

              <div className="grid lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    value={transactionSearch}
                    onChange={(event) =>
                      setTransactionSearch(event.target.value)
                    }
                    placeholder="Description, user, account, space..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Type
                  </label>
                  <select
                    value={transactionTypeFilter}
                    onChange={(event) =>
                      setTransactionTypeFilter(
                        event.target.value as
                          | "all"
                          | "income"
                          | "expense"
                          | "transfer"
                      )
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    User
                  </label>
                  <select
                    value={transactionUserFilter}
                    onChange={(event) =>
                      setTransactionUserFilter(event.target.value)
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">All Users</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.username || user.email || user.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Account
                  </label>
                  <select
                    value={transactionAccountFilter}
                    onChange={(event) =>
                      setTransactionAccountFilter(event.target.value)
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">All Accounts</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} — {account.currency}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Space
                  </label>
                  <select
                    value={transactionSpaceFilter}
                    onChange={(event) =>
                      setTransactionSpaceFilter(event.target.value)
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">All Spaces</option>
                    {spaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Date From
                    </label>
                    <input
                      type="date"
                      value={transactionDateFrom}
                      onChange={(event) =>
                        setTransactionDateFrom(event.target.value)
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Date To
                    </label>
                    <input
                      type="date"
                      value={transactionDateTo}
                      onChange={(event) =>
                        setTransactionDateTo(event.target.value)
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Minimum Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transactionMinAmount}
                    onChange={(event) =>
                      setTransactionMinAmount(event.target.value)
                    }
                    placeholder="0.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Maximum Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transactionMaxAmount}
                    onChange={(event) =>
                      setTransactionMaxAmount(event.target.value)
                    }
                    placeholder="0.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-400">
                  Showing <span className="text-white font-semibold">{adminTransactions.length}</span> transactions
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={clearTransactionFilters}
                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition font-semibold"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={loadAdminTransactions}
                    disabled={loadingAdminTransactions}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition font-semibold"
                  >
                    {loadingAdminTransactions ? "Loading..." : "Apply Filters"}
                  </button>
                </div>
              </div>
            </div>

            {loadingAdminTransactions ? (
              <div className="p-8 text-center text-slate-400">
                Loading transactions...
              </div>
            ) : adminTransactions.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-lg font-semibold text-white">
                  No transactions found
                </p>
                <p className="text-slate-400 mt-1">
                  Try changing the filters or clearing them.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1480px]">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="p-4 text-left">Date</th>
                      <th className="p-4 text-left">Type</th>
                      <th className="p-4 text-left">Amount</th>
                      <th className="p-4 text-left">Description</th>
                      <th className="p-4 text-left">User</th>
                      <th className="p-4 text-left">Account</th>
                      <th className="p-4 text-left">Space</th>
                    </tr>
                  </thead>

                  <tbody>
                    {adminTransactions.map((transaction) => {
                      const amountClass =
                        transaction.type === "income"
                          ? "text-green-400"
                          : transaction.type === "expense"
                          ? "text-red-400"
                          : "text-blue-400";

                      const typeClass =
                        transaction.type === "income"
                          ? "bg-green-500/15 text-green-400 border border-green-500/20"
                          : transaction.type === "expense"
                          ? "bg-red-500/15 text-red-400 border border-red-500/20"
                          : "bg-blue-500/15 text-blue-400 border border-blue-500/20";

                      return (
                        <tr
                          key={transaction.id}
                          className="border-t border-slate-800 hover:bg-slate-800/40 transition"
                        >
                          <td className="p-4 text-sm text-slate-300 whitespace-nowrap">
                            {transaction.occurred_at
                              ? new Date(transaction.occurred_at).toLocaleString()
                              : "-"}
                          </td>

                          <td className="p-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${typeClass}`}>
                              {transaction.type.replace(/\b\w/g, (char) => char.toUpperCase())}
                            </span>
                          </td>

                          <td className={`p-4 font-semibold whitespace-nowrap ${amountClass}`}>
                            {Number(transaction.amount || 0).toFixed(2)} {transaction.currency}
                          </td>

                          <td className="p-4 max-w-xs">
                            <p className="truncate text-slate-300">
                              {transaction.description ||
                                transaction.notes ||
                                "No description"}
                            </p>
                            {transaction.payment_method && (
                              <p className="text-xs text-slate-500 mt-1">
                                {transaction.payment_method}
                              </p>
                            )}
                          </td>

                          <td className="p-4">
                            <p className="font-semibold text-white">
                              {transaction.user?.full_name ||
                                transaction.user?.username ||
                                transaction.user?.email ||
                                "Unknown User"}
                            </p>
                            {transaction.user?.email && (
                              <p className="text-xs text-slate-500 mt-1">
                                {transaction.user.email}
                              </p>
                            )}
                          </td>

                          <td className="p-4">
                            <p className="font-semibold text-white">
                              {transaction.account?.name || "Unknown Account"}
                            </p>
                            {transaction.account?.currency && (
                              <p className="text-xs text-slate-500 mt-1">
                                {transaction.account.currency}
                              </p>
                            )}
                          </td>

                          <td className="p-4">
                            <p className="font-semibold text-white">
                              {transaction.space?.name || "Unknown Space"}
                            </p>
                            {transaction.space?.type && (
                              <p className="text-xs text-slate-500 mt-1">
                                {transaction.space.type}
                              </p>
                            )}
                          </td>

                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditTransaction(transaction)
                                }
                                disabled={savingTransaction}
                                className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition text-sm font-semibold"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteAdminTransaction(transaction)
                                }
                                disabled={savingTransaction}
                                className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 transition text-sm font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Savings */}
      {activeTab === "savings" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">Savings in View</p>
              <h2 className="text-3xl font-bold mt-3 text-blue-400">
                {loadingAdminSavings ? "..." : adminSavings.length}
              </h2>
            </div>
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">Total Target</p>
              <h2 className="text-3xl font-bold mt-3 text-purple-400">
                {loadingAdminSavings ? "..." : `${adminSavingTargetTotal.toFixed(2)} EGP`}
              </h2>
            </div>
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">Current Saved</p>
              <h2 className="text-3xl font-bold mt-3 text-green-400">
                {loadingAdminSavings ? "..." : `${adminSavingCurrentTotal.toFixed(2)} EGP`}
              </h2>
            </div>
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">Remaining</p>
              <h2 className="text-3xl font-bold mt-3 text-cyan-400">
                {loadingAdminSavings ? "..." : `${adminSavingRemainingTotal.toFixed(2)} EGP`}
              </h2>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
            <div className="p-6 border-b border-slate-800 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Savings Goals</h2>
                  <p className="text-slate-400 mt-1">Full control over saving goals across the entire system.</p>
                </div>
                <button
                  type="button"
                  onClick={openCreateSavingGoal}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition font-semibold whitespace-nowrap"
                >
                  + Add Saving Goal
                </button>
              </div>

              <div className="grid lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Search</label>
                  <input
                    type="text"
                    value={savingSearch}
                    onChange={(event) => setSavingSearch(event.target.value)}
                    placeholder="Name, user, space..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">User</label>
                  <select
                    value={savingUserFilter}
                    onChange={(event) => setSavingUserFilter(event.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">All Users</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.username || user.email || user.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Space</label>
                  <select
                    value={savingSpaceFilter}
                    onChange={(event) => setSavingSpaceFilter(event.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">All Spaces</option>
                    {spaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Deadline From</label>
                    <input type="date" value={savingDateFrom} onChange={(event) => setSavingDateFrom(event.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Deadline To</label>
                    <input type="date" value={savingDateTo} onChange={(event) => setSavingDateTo(event.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Min Target</label>
                  <input type="number" min="0" step="0.01" value={savingMinAmount} onChange={(event) => setSavingMinAmount(event.target.value)} placeholder="0.00" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Max Target</label>
                  <input type="number" min="0" step="0.01" value={savingMaxAmount} onChange={(event) => setSavingMaxAmount(event.target.value)} placeholder="0.00" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-400">
                  Showing <span className="text-white font-semibold">{adminSavings.length}</span> saving goals
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={clearSavingFilters} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition font-semibold">Clear</button>
                  <button type="button" onClick={loadAdminSavings} disabled={loadingAdminSavings} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition font-semibold">
                    {loadingAdminSavings ? "Loading..." : "Apply Filters"}
                  </button>
                </div>
              </div>
            </div>

            {loadingAdminSavings ? (
              <div className="p-8 text-center text-slate-400">Loading saving goals...</div>
            ) : adminSavings.length === 0 ? (
              <div className="p-10 text-center text-slate-400">No saving goals found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px]">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="p-4 text-left">Goal</th>
                      <th className="p-4 text-left">User</th>
                      <th className="p-4 text-left">Space</th>
                      <th className="p-4 text-left">Target</th>
                      <th className="p-4 text-left">Current</th>
                      <th className="p-4 text-left">Remaining</th>
                      <th className="p-4 text-left">Progress</th>
                      <th className="p-4 text-left">Deadline</th>
                      <th className="p-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminSavings.map((saving) => (
                      <tr key={saving.id} className="border-t border-slate-800 hover:bg-slate-800/40 transition">
                        <td className="p-4 font-semibold text-white">{saving.name}</td>
                        <td className="p-4">
                          <p className="font-semibold text-white">{saving.user?.full_name || saving.user?.username || saving.user?.email || "Unknown User"}</p>
                          {saving.user?.email && <p className="text-xs text-slate-500 mt-1">{saving.user.email}</p>}
                        </td>
                        <td className="p-4 text-slate-300">{saving.space?.name || "Unknown Space"}</td>
                        <td className="p-4 font-semibold text-purple-400">{Number(saving.target_amount || 0).toFixed(2)} EGP</td>
                        <td className="p-4 font-semibold text-green-400">{Number(saving.current_amount || 0).toFixed(2)} EGP</td>
                        <td className="p-4 font-semibold text-cyan-400">{Number(saving.remaining || 0).toFixed(2)} EGP</td>
                        <td className="p-4">
                          <div className="min-w-[120px]">
                            <div className="text-sm font-semibold">{Number(saving.progress || 0).toFixed(0)}%</div>
                            <div className="h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, Math.max(0, Number(saving.progress || 0)))}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300 whitespace-nowrap">{saving.deadline}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => openEditSavingGoal(saving)} disabled={savingGoalSaving} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition text-sm font-semibold">Edit</button>
                            <button type="button" onClick={() => deleteAdminSaving(saving)} disabled={savingGoalSaving} className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 transition text-sm font-semibold">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Logs */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">Audit Events</p>
              <h2 className="text-3xl font-bold mt-3 text-blue-400">
                {loadingAuditLogs ? "..." : filteredAuditLogs.length}
              </h2>
            </div>
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">Action Types</p>
              <h2 className="text-3xl font-bold mt-3 text-purple-400">
                {loadingAuditLogs ? "..." : auditActions.length}
              </h2>
            </div>
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400">Access</p>
              <h2 className="text-3xl font-bold mt-3 text-green-400">
                Super Admin Only
              </h2>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
            <div className="p-6 border-b border-slate-800 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Audit Logs</h2>
                  <p className="text-slate-400 mt-1">
                    Review sensitive system actions and administrative changes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadAuditLogs}
                  disabled={loadingAuditLogs}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 transition font-semibold"
                >
                  {loadingAuditLogs ? "Loading..." : "Refresh"}
                </button>
              </div>

              <div className="grid lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(event) => setAuditSearch(event.target.value)}
                    placeholder="Action, user, entity, details..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Action
                  </label>
                  <select
                    value={auditActionFilter}
                    onChange={(event) => setAuditActionFilter(event.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">All Actions</option>
                    {auditActions.map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    User
                  </label>
                  <select
                    value={auditUserFilter}
                    onChange={(event) => setAuditUserFilter(event.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">All Users</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.username || user.email || user.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={auditDateFrom}
                    onChange={(event) => setAuditDateFrom(event.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Date To
                  </label>
                  <input
                    type="date"
                    value={auditDateTo}
                    onChange={(event) => setAuditDateTo(event.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-400">
                  Showing <span className="text-white font-semibold">{filteredAuditLogs.length}</span> events
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={clearAuditFilters}
                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition font-semibold"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={loadAuditLogs}
                    disabled={loadingAuditLogs}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition font-semibold"
                  >
                    {loadingAuditLogs ? "Loading..." : "Apply Filters"}
                  </button>
                </div>
              </div>
            </div>

            {loadingAuditLogs ? (
              <div className="p-8 text-center text-slate-400">
                Loading audit logs...
              </div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-lg font-semibold text-white">
                  No audit events found
                </p>
                <p className="text-slate-400 mt-1">
                  Try changing the filters or clearing them.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1400px]">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="p-4 text-left">Time</th>
                      <th className="p-4 text-left">Actor</th>
                      <th className="p-4 text-left">Action</th>
                      <th className="p-4 text-left">Entity</th>
                      <th className="p-4 text-left">Space ID</th>
                      <th className="p-4 text-left">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-t border-slate-800 hover:bg-slate-800/40 transition align-top"
                      >
                        <td className="p-4 text-sm text-slate-300 whitespace-nowrap">
                          {log.created_at
                            ? new Date(log.created_at).toLocaleString()
                            : "-"}
                        </td>

                        <td className="p-4">
                          <p className="font-semibold text-white">
                            {log.actor?.full_name ||
                              log.actor?.username ||
                              log.actor?.email ||
                              "System"}
                          </p>
                          {log.actor?.email && (
                            <p className="text-xs text-slate-500 mt-1">
                              {log.actor.email}
                            </p>
                          )}
                        </td>

                        <td className="p-4">
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20">
                            {log.action}
                          </span>
                        </td>

                        <td className="p-4 text-sm text-slate-300">
                          <div>{log.entity_type || "-"}</div>
                          {log.entity_id && (
                            <div className="text-xs text-slate-500 mt-1 break-all">
                              {log.entity_id}
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-xs text-slate-500 break-all max-w-xs">
                          {log.space_id || "-"}
                        </td>

                        <td className="p-4 max-w-xl">
                          <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words font-sans">
                            {JSON.stringify(log.details ?? {}, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Login Activity */}
      {activeTab === "login_activity" && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
            <div className="p-6 border-b border-slate-800 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Login Activity</h2>
                  <p className="text-slate-400 mt-1">
                    Review successful login events, IP addresses and approximate locations.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadLoginActivities}
                  disabled={loadingLoginActivities}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 transition font-semibold"
                >
                  {loadingLoginActivities ? "Loading..." : "Refresh"}
                </button>
              </div>

              <div className="grid lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Search</label>
                  <input
                    type="text"
                    value={loginActivitySearch}
                    onChange={(event) => setLoginActivitySearch(event.target.value)}
                    placeholder="Name, email, IP, city, country..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">User</label>
                  <select
                    value={loginActivityUserFilter}
                    onChange={(event) => setLoginActivityUserFilter(event.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">All Users</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.username || user.email || user.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Date From</label>
                  <input
                    type="date"
                    value={loginActivityDateFrom}
                    onChange={(event) => setLoginActivityDateFrom(event.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Date To</label>
                  <input
                    type="date"
                    value={loginActivityDateTo}
                    onChange={(event) => setLoginActivityDateTo(event.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-400">
                  Showing <span className="text-white font-semibold">{filteredLoginActivities.length}</span> of {" "}
                  <span className="text-white font-semibold">{loginActivities.length}</span> login events
                </p>

                {(loginActivitySearch || loginActivityUserFilter || loginActivityDateFrom || loginActivityDateTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginActivitySearch("");
                      setLoginActivityUserFilter("");
                      setLoginActivityDateFrom("");
                      setLoginActivityDateTo("");
                    }}
                    className="text-sm text-blue-400 hover:text-blue-300 transition"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {loadingLoginActivities ? (
              <div className="p-10 text-center text-slate-400">Loading login activity...</div>
            ) : filteredLoginActivities.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-lg font-semibold text-white">No login activity found</p>
                <p className="text-slate-400 mt-1">New successful logins will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1450px]">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="p-4 text-left">Login Time</th>
                      <th className="p-4 text-left">User</th>
                      <th className="p-4 text-left">IP Address</th>
                      <th className="p-4 text-left">Location</th>
                      <th className="p-4 text-left">Coordinates</th>
                      <th className="p-4 text-left">Timezone</th>
                      <th className="p-4 text-left">Device / Browser</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredLoginActivities.map((activity) => {
                      const locationParts = [
                        activity.city,
                        activity.region,
                        activity.country,
                      ].filter(Boolean);

                      const locationText =
                        locationParts.length > 0
                          ? locationParts.join(", ")
                          : "Unknown";

                      return (
                        <tr
                          key={activity.id}
                          className="border-t border-slate-800 hover:bg-slate-800/40 transition"
                        >
                          <td className="p-4 text-sm text-slate-300 whitespace-nowrap">
                            {new Date(activity.logged_in_at).toLocaleString()}
                          </td>

                          <td className="p-4">
                            <p className="font-semibold text-white">
                              {activity.full_name || activity.email || "Unknown User"}
                            </p>
                            {activity.email && (
                              <p className="text-xs text-slate-500 mt-1">{activity.email}</p>
                            )}
                          </td>

                          <td className="p-4">
                            <span className="font-mono text-sm text-cyan-400">
                              {activity.ip_address || "Unknown"}
                            </span>
                          </td>

                          <td className="p-4 text-sm text-slate-300">
                            <p>{locationText}</p>
                            {activity.postal_code && (
                              <p className="text-xs text-slate-500 mt-1">
                                Postal: {activity.postal_code}
                              </p>
                            )}
                          </td>

                          <td className="p-4 text-sm text-slate-300 whitespace-nowrap">
                            {activity.latitude !== null && activity.longitude !== null ? (
                              <a
                                href={`https://www.google.com/maps?q=${activity.latitude},${activity.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline"
                              >
                                {activity.latitude.toFixed(4)}, {activity.longitude.toFixed(4)}
                              </a>
                            ) : (
                              "Unknown"
                            )}
                          </td>

                          <td className="p-4 text-sm text-slate-300 whitespace-nowrap">
                            {activity.timezone || "Unknown"}
                          </td>

                          <td className="p-4 max-w-md">
                            <p className="text-xs text-slate-400 break-all">
                              {activity.user_agent || "Unknown"}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Budget Create / Edit Modal */}
      {showBudgetModal && (
        <div
          className="fixed inset-0 z-[86] bg-black/80 flex items-center justify-center p-4"
          onClick={closeBudgetModal}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h3 className="text-2xl font-bold">
                  {selectedAdminBudget
                    ? "Edit Budget"
                    : "Add Budget"}
                </h3>
                <p className="text-slate-400 mt-1">
                  Manage every budget field as Super Admin.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBudgetModal}
                disabled={savingBudget}
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xl transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  User
                </label>
                <select
                  value={budgetForm.user_id}
                  onChange={(event) =>
                    setBudgetForm((prev) => ({
                      ...prev,
                      user_id: event.target.value,
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Select User</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name ||
                        user.username ||
                        user.email ||
                        user.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Space
                </label>
                <select
                  value={budgetForm.space_id}
                  onChange={(event) =>
                    setBudgetForm((prev) => ({
                      ...prev,
                      space_id: event.target.value,
                      category_id: "",
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Select Space</option>
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name} — {space.type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Category
                </label>
                <select
                  value={budgetForm.category_id}
                  onChange={(event) =>
                    setBudgetForm((prev) => ({
                      ...prev,
                      category_id: event.target.value,
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Select Category</option>
                  {budgetCategories
                    .filter(
                      (category) =>
                        !budgetForm.space_id ||
                        category.space_id ===
                          budgetForm.space_id
                    )
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Budget Name
                </label>
                <input
                  type="text"
                  value={budgetForm.name}
                  onChange={(event) =>
                    setBudgetForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Food Budget"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Budget Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetForm.amount}
                  onChange={(event) =>
                    setBudgetForm((prev) => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Spent
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetForm.spent}
                  onChange={(event) =>
                    setBudgetForm((prev) => ({
                      ...prev,
                      spent: event.target.value,
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={budgetForm.start_date}
                  onChange={(event) =>
                    setBudgetForm((prev) => ({
                      ...prev,
                      start_date: event.target.value,
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={budgetForm.end_date}
                  onChange={(event) =>
                    setBudgetForm((prev) => ({
                      ...prev,
                      end_date: event.target.value,
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-800">
              <button
                type="button"
                onClick={closeBudgetModal}
                disabled={savingBudget}
                className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveAdminBudget}
                disabled={savingBudget}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition font-semibold"
              >
                {savingBudget
                  ? selectedAdminBudget
                    ? "Updating..."
                    : "Saving..."
                  : selectedAdminBudget
                  ? "Update Budget"
                  : "Create Budget"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saving Create / Edit Modal */}
      {showSavingModal && (
        <div
          className="fixed inset-0 z-[87] bg-black/80 flex items-center justify-center p-4"
          onClick={closeSavingModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h3 className="text-2xl font-bold">
                  {selectedAdminSaving ? "Edit Saving Goal" : "Add Saving Goal"}
                </h3>
                <p className="text-slate-400 mt-1">Manage every saving goal field as Super Admin.</p>
              </div>
              <button type="button" onClick={closeSavingModal} disabled={savingGoalSaving} className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xl transition">×</button>
            </div>

            <div className="p-6 grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-slate-400 mb-2">User</label>
                <select value={savingGoalForm.user_id} onChange={(event) => setSavingGoalForm((prev) => ({ ...prev, user_id: event.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500">
                  <option value="">Select User</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.username || user.email || user.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Space</label>
                <select value={savingGoalForm.space_id} onChange={(event) => setSavingGoalForm((prev) => ({ ...prev, space_id: event.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500">
                  <option value="">Select Space</option>
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name} — {space.type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-2">Goal Name</label>
                <input type="text" value={savingGoalForm.name} onChange={(event) => setSavingGoalForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Buy New Laptop" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Target Amount</label>
                <input type="number" min="0" step="0.01" value={savingGoalForm.target_amount} onChange={(event) => setSavingGoalForm((prev) => ({ ...prev, target_amount: event.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Current Amount</label>
                <input type="number" min="0" step="0.01" value={savingGoalForm.current_amount} onChange={(event) => setSavingGoalForm((prev) => ({ ...prev, current_amount: event.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-2">Deadline</label>
                <input type="date" value={savingGoalForm.deadline} onChange={(event) => setSavingGoalForm((prev) => ({ ...prev, deadline: event.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-800">
              <button type="button" onClick={closeSavingModal} disabled={savingGoalSaving} className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition font-semibold">Cancel</button>
              <button type="button" onClick={saveAdminSaving} disabled={savingGoalSaving} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition font-semibold">
                {savingGoalSaving ? (selectedAdminSaving ? "Updating..." : "Saving...") : selectedAdminSaving ? "Update Saving Goal" : "Create Saving Goal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Create / Edit Modal */}
      {showTransactionModal && (
        <div
          className="fixed inset-0 z-[85] bg-black/80 flex items-center justify-center p-4"
          onClick={closeTransactionModal}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h3 className="text-2xl font-bold">
                  {selectedAdminTransaction
                    ? "Edit Transaction"
                    : "Add Transaction"}
                </h3>
                <p className="text-slate-400 mt-1">
                  Manage every transaction field as Super Admin.
                </p>
              </div>

              <button
                type="button"
                onClick={closeTransactionModal}
                disabled={savingTransaction}
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xl transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  User
                </label>
                <select
                  value={transactionForm.user_id}
                  onChange={(event) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      user_id: event.target.value,
                      space_id: "",
                      account_id: "",
                      category_id: "",
                      currency: "EGP",
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Select User</option>
                  {transactionUsers.map((user) => (
                    <option
                      key={user.id}
                      value={user.id}
                    >
                      {user.full_name ||
                        user.username ||
                        user.email ||
                        user.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Space
                </label>
                <select
                  value={transactionForm.space_id}
                  onChange={(event) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      space_id: event.target.value,
                      account_id: "",
                      category_id: "",
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Select Space</option>
                  {transactionSpaces.map((space) => (
                    <option
                      key={space.id}
                      value={space.id}
                    >
                      {space.name} — {space.type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Account
                </label>
                <select
                  value={transactionForm.account_id}
                  onChange={(event) => {
                    const selectedAccount = transactionAccounts.find(
                      (account) =>
                        account.id === event.target.value
                    );

                    setTransactionForm((prev) => ({
                      ...prev,
                      account_id: event.target.value,
                      currency:
                        selectedAccount?.currency ||
                        prev.currency,
                    }));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Select Account</option>
                  {transactionAccounts
                    .filter(
                      (account) =>
                        !transactionForm.space_id ||
                        account.space_id ===
                          transactionForm.space_id
                    )
                    .map((account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name} — {account.currency}
                        {account.is_archived ? " (Archived)" : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Category
                </label>
                <select
                  value={transactionForm.category_id}
                  onChange={(event) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      category_id: event.target.value,
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">No Category</option>
                  {transactionCategories
                    .filter(
                      (category) =>
                        !transactionForm.space_id ||
                        category.space_id ===
                          transactionForm.space_id
                    )
                    .map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Type
                </label>
                <select
                  value={transactionForm.type}
                  onChange={(event) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      type: event.target.value as
                        | "income"
                        | "expense"
                        | "transfer",
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={(event) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Currency
                </label>
                <input
                  type="text"
                  value={transactionForm.currency}
                  onChange={(event) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      currency: event.target.value,
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white uppercase outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={transactionForm.occurred_at}
                  onChange={(event) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      occurred_at: event.target.value,
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Payment Method
                </label>
                <input
                  type="text"
                  value={transactionForm.payment_method}
                  onChange={(event) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      payment_method: event.target.value,
                    }))
                  }
                  placeholder="Cash, Card, Bank..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={transactionForm.description}
                  onChange={(event) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-2">
                  Notes
                </label>
                <textarea
                  rows={4}
                  value={transactionForm.notes}
                  onChange={(event) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
              <button
                type="button"
                onClick={closeTransactionModal}
                disabled={savingTransaction}
                className="px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 transition font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveAdminTransaction}
                disabled={savingTransaction}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition font-semibold"
              >
                {savingTransaction
                  ? "Saving..."
                  : selectedAdminTransaction
                  ? "Save Changes"
                  : "Create Transaction"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedSpace && (
        <div
          className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4"
          onClick={closeAddMemberModal}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h3 className="text-2xl font-bold">
                  Add Member
                </h3>
                <p className="text-slate-400 mt-1">
                  Add an active user to {selectedSpace.name}.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddMemberModal}
                disabled={addingMember}
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xl transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              {users.filter(
                (user) =>
                  user.status === "active" &&
                  !selectedSpace.members.some(
                    (member) =>
                      member.user_id === user.id
                  )
              ).length === 0 ? (
                <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-5 text-center">
                  <p className="font-semibold text-white">
                    No available users
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    All active users are already members of this space.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      User
                    </label>

                    <select
                      value={selectedMemberId}
                      onChange={(event) =>
                        setSelectedMemberId(
                          event.target.value
                        )
                      }
                      disabled={addingMember}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="">
                        Select a user
                      </option>

                      {users
                        .filter(
                          (user) =>
                            user.status === "active" &&
                            !selectedSpace.members.some(
                              (member) =>
                                member.user_id ===
                                user.id
                            )
                        )
                        .map((user) => (
                          <option
                            key={user.id}
                            value={user.id}
                          >
                            {user.full_name ||
                              user.username ||
                              user.email ||
                              "Unknown User"}
                            {user.email
                              ? ` — ${user.email}`
                              : ""}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="bg-slate-800/70 rounded-xl p-4 border border-slate-700/60">
                    <p className="text-sm font-semibold text-white">
                      Access level
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      The user will be added as a <span className="text-blue-400 font-semibold">member</span>.
                    </p>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAddMemberModal}
                  disabled={addingMember}
                  className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 transition font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={addMemberToSpace}
                  disabled={
                    addingMember ||
                    !selectedMemberId
                  }
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
                >
                  {addingMember
                    ? "Adding..."
                    : "Add Member"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Space Details Modal */}
      {selectedSpace && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
          onClick={closeSpaceDetails}
        >
          <div
            className="w-full max-w-5xl max-h-[calc(100vh-2rem)] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="sticky top-0 z-20 flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
              <div>
                <h3 className="text-2xl font-bold">
                  Space Details
                </h3>

                <p className="text-slate-400 mt-1">
                  {selectedSpace.name}
                </p>
              </div>

              <button
                type="button"
                onClick={closeSpaceDetails}
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-xl transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-800/70 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">
                    Space Name
                  </p>
                  <p className="font-semibold mt-1">
                    {selectedSpace.name}
                  </p>
                </div>

                <div className="bg-slate-800/70 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">
                    Type
                  </p>
                  <p className="font-semibold mt-1">
                    {selectedSpace.type}
                  </p>
                </div>

                <div className="bg-slate-800/70 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">
                    Base Currency
                  </p>
                  <p className="font-semibold mt-1 text-cyan-400">
                    {selectedSpace.base_currency}
                  </p>
                </div>

                <div className="bg-slate-800/70 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">
                    Owner
                  </p>
                  <p className="font-semibold mt-1">
                    {selectedSpace.owner?.name ||
                      selectedSpace.owner?.email ||
                      "Unknown User"}
                  </p>

                  {selectedSpace.owner?.email && (
                    <p className="text-xs text-slate-400 mt-1 break-all">
                      {selectedSpace.owner.email}
                    </p>
                  )}
                </div>

                <div className="bg-slate-800/70 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">
                    Members
                  </p>
                  <p className="font-semibold mt-1 text-green-400">
                    {selectedSpace.members.length}
                  </p>
                </div>

                <div className="bg-slate-800/70 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">
                    Accounts
                  </p>
                  <p className="font-semibold mt-1 text-cyan-400">
                    {selectedSpace.accounts.length}
                  </p>
                </div>

                <div className="bg-slate-800/70 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">
                    Space ID
                  </p>
                  <p className="font-semibold mt-1 text-xs break-all">
                    {selectedSpace.id}
                  </p>
                </div>

                <div className="bg-slate-800/70 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">
                    Created
                  </p>
                  <p className="font-semibold mt-1">
                    {selectedSpace.created_at
                      ? new Date(
                          selectedSpace.created_at
                        ).toLocaleString()
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/70 rounded-xl overflow-hidden border border-slate-700/60">
                <div className="p-4 border-b border-slate-700/60 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">
                      Members
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Users who currently have access to this space.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openAddMemberModal}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition font-semibold text-sm whitespace-nowrap"
                  >
                    Add Member
                  </button>
                </div>

                {selectedSpace.members.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    No members found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead className="bg-slate-900/60">
                        <tr>
                          <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                            User
                          </th>
                          <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                            Email
                          </th>
                          <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                            Role
                          </th>
                          <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                            Joined
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedSpace.members.map(
                          (member) => (
                            <tr
                              key={`${member.user_id}-${member.created_at}`}
                              className="border-t border-slate-700/60"
                            >
                              <td className="p-3">
                                <p className="font-semibold text-white">
                                  {member.user?.name ||
                                    member.user?.username ||
                                    "Unknown User"}
                                </p>
                                {member.user?.username && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    {member.user.username}
                                  </p>
                                )}
                              </td>

                              <td className="p-3 text-sm text-slate-300">
                                {member.user?.email || "-"}
                              </td>

                              <td className="p-3">
                                {selectedSpace.owner_id ===
                                member.user_id ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20">
                                      Owner
                                    </span>
                                    <p className="text-[11px] text-slate-500">
                                      Protected
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 min-w-[260px]">
                                    <select
                                      value={
                                        memberRoleChanges[
                                          member.user_id
                                        ] ?? member.role
                                      }
                                      onChange={(event) =>
                                        handleMemberRoleChange(
                                          member.user_id,
                                          event.target.value as SpaceMemberRole
                                        )
                                      }
                                      disabled={
                                        savingMemberRoleUserId ===
                                        member.user_id
                                      }
                                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                                    >
                                      <option value="viewer">
                                        Viewer
                                      </option>
                                      <option value="member">
                                        Member
                                      </option>
                                      <option value="admin">
                                        Admin
                                      </option>
                                    </select>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        saveMemberRole(member)
                                      }
                                      disabled={
                                        savingMemberRoleUserId ===
                                          member.user_id ||
                                        (memberRoleChanges[
                                          member.user_id
                                        ] ?? member.role) ===
                                          member.role
                                      }
                                      className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold text-sm"
                                    >
                                      {savingMemberRoleUserId ===
                                      member.user_id
                                        ? "Saving..."
                                        : "Save"}
                                    </button>
                                  </div>
                                )}
                              </td>

                              <td className="p-3 text-sm text-slate-300 whitespace-nowrap">
                                {member.created_at
                                  ? new Date(
                                      member.created_at
                                    ).toLocaleString()
                                  : "-"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-slate-800/70 rounded-xl overflow-hidden border border-slate-700/60">
                <div className="p-4 border-b border-slate-700/60">
                  <p className="font-semibold text-white">
                    Accounts in this Space
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Accounts that belong to this space.
                  </p>
                </div>

                {selectedSpace.accounts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    No accounts found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px]">
                      <thead className="bg-slate-900/60">
                        <tr>
                          <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                            Account
                          </th>
                          <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                            Type
                          </th>
                          <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                            Currency
                          </th>
                          <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                            Owner
                          </th>
                          <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                            Status
                          </th>
                          <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                            Created
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedSpace.accounts.map(
                          (account) => (
                            <tr
                              key={account.id}
                              className="border-t border-slate-700/60"
                            >
                              <td className="p-3">
                                <p className="font-semibold text-white">
                                  {account.name}
                                </p>
                              </td>

                              <td className="p-3 text-sm text-slate-300">
                                {account.type}
                              </td>

                              <td className="p-3 text-sm text-slate-300">
                                {account.currency}
                              </td>

                              <td className="p-3">
                                <p className="font-semibold text-white">
                                  {account.owner?.name ||
                                    account.owner?.email ||
                                    "Unknown User"}
                                </p>

                                {account.owner?.email && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    {account.owner.email}
                                  </p>
                                )}
                              </td>

                              <td className="p-3">
                                <span
                                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    account.is_archived
                                      ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
                                      : "bg-green-500/15 text-green-400 border border-green-500/20"
                                  }`}
                                >
                                  {account.is_archived
                                    ? "Archived"
                                    : "Active"}
                                </span>
                              </td>

                              <td className="p-3 text-sm text-slate-300 whitespace-nowrap">
                                {account.created_at
                                  ? new Date(
                                      account.created_at
                                    ).toLocaleString()
                                  : "-"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={closeSpaceDetails}
                  className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition font-semibold"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {selectedAccount &&
        accountModalMode && (
          <div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={closeAccountModal}
          >

            <div
              className="w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="sticky top-0 z-20 flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/95 backdrop-blur">

                <div>
                  <h3 className="text-2xl font-bold">
                    {accountModalMode === "view"
                      ? "Account Details"
                      : "Edit Account"}
                  </h3>

                  <p className="text-slate-400 mt-1">
                    {selectedAccount.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeAccountModal}
                  className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-xl transition"
                >
                  ×
                </button>

              </div>

              {accountModalMode === "view" ? (
                <div className="p-6 space-y-4">

                  <div className="grid md:grid-cols-2 gap-4">

                    <div className="bg-slate-800/70 rounded-xl p-4">
                      <p className="text-slate-400 text-sm">
                        Account Name
                      </p>

                      <p className="font-semibold mt-1">
                        {selectedAccount.name}
                      </p>
                    </div>

                    <div className="bg-slate-800/70 rounded-xl p-4">
                      <p className="text-slate-400 text-sm">
                        Type
                      </p>

                      <p className="font-semibold mt-1">
                        {selectedAccount.type}
                      </p>
                    </div>

                    <div className="bg-slate-800/70 rounded-xl p-4">
                      <p className="text-slate-400 text-sm">
                        Currency
                      </p>

                      <p className="font-semibold mt-1">
                        {selectedAccount.currency}
                      </p>
                    </div>

                    <div className="bg-slate-800/70 rounded-xl p-4">
                      <p className="text-slate-400 text-sm">
                        Opening Balance
                      </p>

                      <p className="font-semibold mt-1 text-cyan-400">
                        {Number(
                          selectedAccount.opening_balance ||
                            0
                        ).toFixed(2)}{" "}
                        {selectedAccount.currency}
                      </p>
                    </div>

                    <div className="bg-slate-800/70 rounded-xl p-4">
                      <p className="text-slate-400 text-sm">
                        Owner
                      </p>

                      <p className="font-semibold mt-1">
                        {selectedAccount.owner?.name ||
                          "Unknown User"}
                      </p>

                      {selectedAccount.owner?.email && (
                        <p className="text-xs text-slate-400 mt-1 break-all">
                          {selectedAccount.owner.email}
                        </p>
                      )}
                    </div>

                    <div className="bg-slate-800/70 rounded-xl p-4">
                      <p className="text-slate-400 text-sm">
                        Current Balance
                      </p>

                      <p className="font-semibold mt-1 text-cyan-400">
                        {Number(
                          selectedAccount.current_balance ||
                            0
                        ).toFixed(2)}{" "}
                        {selectedAccount.currency}
                      </p>
                    </div>

                    <div className="bg-slate-800/70 rounded-xl p-4">
                      <p className="text-slate-400 text-sm">
                        Transactions
                      </p>

                      <p className="font-semibold mt-1">
                        {selectedAccount.transactions_count}
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        Income: {Number(selectedAccount.total_income || 0).toFixed(2)} {selectedAccount.currency}
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        Expenses: {Number(selectedAccount.total_expenses || 0).toFixed(2)} {selectedAccount.currency}
                      </p>
                    </div>

                    <div className="bg-slate-800/70 rounded-xl p-4">
                      <p className="text-slate-400 text-sm">
                        Space ID
                      </p>

                      <p className="font-semibold mt-1 text-xs break-all">
                        {selectedAccount.space_id}
                      </p>
                    </div>

                    <div className="bg-slate-800/70 rounded-xl p-4">
                      <p className="text-slate-400 text-sm">
                        Status
                      </p>

                      <p className="font-semibold mt-1">
                        {selectedAccount.is_archived
                          ? "Archived"
                          : "Active"}
                      </p>
                    </div>

                    <div className="bg-slate-800/70 rounded-xl p-4">
                      <p className="text-slate-400 text-sm">
                        Created
                      </p>

                      <p className="font-semibold mt-1">
                        {selectedAccount.created_at
                          ? new Date(
                              selectedAccount.created_at
                            ).toLocaleString()
                          : "-"}
                      </p>
                    </div>

                  </div>

                  <div className="bg-slate-800/70 rounded-xl p-4">

                    <p className="text-slate-400 text-sm">
                      Description
                    </p>

                    <p className="mt-1">
                      {selectedAccount.description ||
                        "No description"}
                    </p>

                  </div>

                  {/* Transaction History */}
                  <div className="bg-slate-800/70 rounded-xl overflow-hidden border border-slate-700/60">
                    <div className="p-4 border-b border-slate-700/60 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          Transaction History
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Showing up to the 100 most recent transactions for this account.
                        </p>
                      </div>

                      <span className="text-xs text-slate-400">
                        {selectedAccount.transactions_count} total
                      </span>
                    </div>

                    {loadingTransactions ? (
                      <div className="p-6 text-center text-slate-400">
                        Loading transactions...
                      </div>
                    ) : accountTransactions.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">
                        No transactions found for this account.
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[300px]">
                        <table className="w-full min-w-[760px]">
                          <thead className="bg-slate-900/60 sticky top-0">
                            <tr>
                              <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                                Date
                              </th>
                              <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                                Type
                              </th>
                              <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                                Amount
                              </th>
                              <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                                Description
                              </th>
                              <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                                Payment
                              </th>
                              <th className="p-3 text-left text-xs text-slate-400 uppercase tracking-wide">
                                User
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {accountTransactions.map((transaction) => {
                              const transactionUser = transaction.user_id
                                ? users.find(
                                    (user) =>
                                      user.id === transaction.user_id
                                  )
                                : null;

                              const typeLabel = String(
                                transaction.type
                              )
                                .replace("_", " ")
                                .replace(/\b\w/g, (char) =>
                                  char.toUpperCase()
                                );

                              const amountClass =
                                transaction.type === "income"
                                  ? "text-green-400"
                                  : transaction.type === "expense"
                                  ? "text-red-400"
                                  : "text-blue-400";

                              return (
                                <tr
                                  key={transaction.id}
                                  className="border-t border-slate-700/60"
                                >
                                  <td className="p-3 text-sm text-slate-300 whitespace-nowrap">
                                    {transaction.occurred_at
                                      ? new Date(
                                          transaction.occurred_at
                                        ).toLocaleString()
                                      : "-"}
                                  </td>

                                  <td className="p-3">
                                    <span
                                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        transaction.type === "income"
                                          ? "bg-green-500/15 text-green-400 border border-green-500/20"
                                          : transaction.type === "expense"
                                          ? "bg-red-500/15 text-red-400 border border-red-500/20"
                                          : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                                      }`}
                                    >
                                      {typeLabel}
                                    </span>
                                  </td>

                                  <td
                                    className={`p-3 font-semibold whitespace-nowrap ${amountClass}`}
                                  >
                                    {Number(
                                      transaction.amount || 0
                                    ).toFixed(2)} {transaction.currency}
                                  </td>

                                  <td className="p-3 text-sm text-slate-300 max-w-xs">
                                    <p className="truncate">
                                      {transaction.description ||
                                        transaction.notes ||
                                        "No description"}
                                    </p>
                                  </td>

                                  <td className="p-3 text-sm text-slate-400 whitespace-nowrap">
                                    {transaction.payment_method || "-"}
                                  </td>

                                  <td className="p-3 text-sm text-slate-300 whitespace-nowrap">
                                    {transactionUser?.full_name ||
                                      transactionUser?.username ||
                                      transactionUser?.email ||
                                      "Unknown User"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">

                    <button
                      type="button"
                      onClick={() =>
                        openChangeOwner(
                          selectedAccount
                        )
                      }
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition font-semibold"
                    >
                      Change Owner
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openEditAccount(
                          selectedAccount
                        )
                      }
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition font-semibold"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleArchiveAccount(
                          selectedAccount
                        )
                      }
                      className="px-4 py-2 rounded-lg bg-yellow-600/90 hover:bg-yellow-600 transition font-semibold"
                    >
                      {selectedAccount.is_archived
                        ? "Restore"
                        : "Archive"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteAccount(
                          selectedAccount
                        )
                      }
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition font-semibold"
                    >
                      Delete
                    </button>

                  </div>

                </div>
              ) : (
                <div className="p-6 space-y-5">

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Account Name
                    </label>

                    <input
                      value={accountForm.name}
                      onChange={(e) =>
                        setAccountForm(
                          (prev) => ({
                            ...prev,
                            name: e.target.value,
                          })
                        )
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Account Type
                    </label>

                    <input
                      value={accountForm.type}
                      onChange={(e) =>
                        setAccountForm((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }))
                      }
                      placeholder="cash, bank, card..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Currency
                    </label>

                    <input
                      value={accountForm.currency}
                      onChange={(e) =>
                        setAccountForm(
                          (prev) => ({
                            ...prev,
                            currency:
                              e.target.value,
                          })
                        )
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Opening Balance
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      value={
                        accountForm.opening_balance
                      }
                      onChange={(e) =>
                        setAccountForm(
                          (prev) => ({
                            ...prev,
                            opening_balance:
                              e.target.value,
                          })
                        )
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Owner
                    </label>

                    <select
                      value={accountForm.owner_id ?? ""}
                      onChange={(e) =>
                        setAccountForm((prev) => ({
                          ...prev,
                          owner_id: e.target.value || null,
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                    >
                      <option value="">
                        Unassigned
                      </option>

                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name || user.username || user.email || user.id}
                          {user.status === "disabled" ? " (Disabled)" : ""}
                        </option>
                      ))}
                    </select>

                    <p className="text-xs text-slate-500 mt-2">
                      Choose the user who owns this account.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Description
                    </label>

                    <textarea
                      rows={4}
                      value={
                        accountForm.description
                      }
                      onChange={(e) =>
                        setAccountForm(
                          (prev) => ({
                            ...prev,
                            description:
                              e.target.value,
                          })
                        )
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">

                    <button
                      type="button"
                      onClick={closeAccountModal}
                      className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition font-semibold"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={
                        saveAccountChanges
                      }
                      disabled={
                        savingAccountId ===
                        selectedAccount.id
                      }
                      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition font-semibold"
                    >
                      {savingAccountId ===
                      selectedAccount.id
                        ? "Saving..."
                        : "Save Changes"}
                    </button>

                  </div>

                </div>
              )}

            </div>

          </div>
        )}



      {showCreateAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between gap-4 p-6 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-bold">
                  Add Account
                </h2>
                <p className="text-slate-400 mt-1">
                  Create an account for any user in any space.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateAccount}
                disabled={creatingAccount}
                className="text-2xl text-slate-400 hover:text-white disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Owner
                  </label>

                  <select
                    value={newAccountForm.owner_id}
                    onChange={(e) =>
                      setNewAccountForm((prev) => ({
                        ...prev,
                        owner_id: e.target.value,
                      }))
                    }
                    disabled={creatingAccount}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">
                      Select Owner
                    </option>

                    {users.map((user) => (
                      <option
                        key={user.id}
                        value={user.id}
                      >
                        {user.full_name ||
                          user.username ||
                          user.email ||
                          user.id}
                        {user.status === "disabled"
                          ? " (Disabled)"
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Space
                  </label>

                  <select
                    value={newAccountForm.space_id}
                    onChange={(e) =>
                      setNewAccountForm((prev) => ({
                        ...prev,
                        space_id: e.target.value,
                      }))
                    }
                    disabled={creatingAccount}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">
                      Select Space
                    </option>

                    {spaces.map((space) => (
                      <option
                        key={space.id}
                        value={space.id}
                      >
                        {space.name} ({space.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Account Name
                  </label>

                  <input
                    value={newAccountForm.name}
                    onChange={(e) =>
                      setNewAccountForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    disabled={creatingAccount}
                    placeholder="Cash Wallet"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Account Type
                  </label>

                  <input
                    value={newAccountForm.type}
                    onChange={(e) =>
                      setNewAccountForm((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                    disabled={creatingAccount}
                    placeholder="cash, bank, card..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Currency
                  </label>

                  <input
                    value={newAccountForm.currency}
                    onChange={(e) =>
                      setNewAccountForm((prev) => ({
                        ...prev,
                        currency: e.target.value,
                      }))
                    }
                    disabled={creatingAccount}
                    placeholder="EGP"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Opening Balance
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    value={newAccountForm.opening_balance}
                    onChange={(e) =>
                      setNewAccountForm((prev) => ({
                        ...prev,
                        opening_balance: e.target.value,
                      }))
                    }
                    disabled={creatingAccount}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Description
                </label>

                <textarea
                  rows={4}
                  value={newAccountForm.description}
                  onChange={(e) =>
                    setNewAccountForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  disabled={creatingAccount}
                  placeholder="Optional description"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500 resize-none disabled:opacity-50"
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={newAccountForm.is_archived}
                  onChange={(e) =>
                    setNewAccountForm((prev) => ({
                      ...prev,
                      is_archived: e.target.checked,
                    }))
                  }
                  disabled={creatingAccount}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800"
                />
                Create as archived
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateAccount}
                  disabled={creatingAccount}
                  className="px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={createAccount}
                  disabled={creatingAccount}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition font-semibold"
                >
                  {creatingAccount
                    ? "Creating..."
                    : "Create Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* User create/edit modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedAdminUser ? "Edit User" : "Add User"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {selectedAdminUser
                    ? "Update the user's account and profile information."
                    : "Create a new user account from Super Admin."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeUserModal}
                disabled={savingUser}
                className="rounded-lg bg-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Full Name</label>
                <input
                  value={userForm.full_name}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  disabled={savingUser}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Username</label>
                <input
                  value={userForm.username}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  disabled={savingUser}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  disabled={savingUser}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  {selectedAdminUser ? "New Password (optional)" : "Password"}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  disabled={savingUser}
                  placeholder={
                    selectedAdminUser
                      ? "Leave blank to keep current password"
                      : "Minimum 6 characters"
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      role: e.target.value as UserForm["role"],
                    }))
                  }
                  disabled={savingUser || Boolean(selectedAdminUser?.id === currentUserId)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Language</label>
                <select
                  value={userForm.language}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      language: e.target.value as "ar" | "en",
                    }))
                  }
                  disabled={savingUser}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-400">Avatar URL</label>
                <input
                  value={userForm.avatar_url}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      avatar_url: e.target.value,
                    }))
                  }
                  disabled={savingUser}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-5">
              <button
                type="button"
                onClick={closeUserModal}
                disabled={savingUser}
                className="rounded-xl bg-slate-700 px-5 py-3 font-semibold transition hover:bg-slate-600 disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveAdminUser}
                disabled={savingUser}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-700 disabled:opacity-40"
              >
                {savingUser
                  ? selectedAdminUser
                    ? "Updating..."
                    : "Creating..."
                  : selectedAdminUser
                  ? "Update User"
                  : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}