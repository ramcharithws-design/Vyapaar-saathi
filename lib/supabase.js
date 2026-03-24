import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
SQL TO RUN IN SUPABASE:

create table users (
  id uuid references auth.users primary key,
  email text,
  name text,
  created_at timestamp with time zone default now()
);

create table sales (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  item text not null,
  quantity numeric,
  unit text,
  amount numeric not null,
  language text,
  created_at timestamp with time zone default now()
);

create table expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  item text not null,
  amount numeric not null,
  language text,
  created_at timestamp with time zone default now()
);

create table customers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  name text not null,
  language text,
  created_at timestamp with time zone default now()
);

create table customer_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  customer_id uuid references customers(id),
  type text,
  item text,
  amount numeric not null,
  language text,
  created_at timestamp with time zone default now()
);
*/

// ─── SALES ───────────────────────────────────────────────
export async function recordSale(data, language, userId) {
  const { error } = await supabase.from("sales").insert([{
    user_id: userId,
    item: data.item,
    quantity: data.quantity || null,
    unit: data.unit || null,
    amount: data.amount,
    language
  }]);
  if (error) throw error;
  return true;
}

export async function deleteSale(itemName, userId) {
  const { data: sales } = await supabase
    .from("sales")
    .select("*")
    .eq("user_id", userId)
    .ilike("item", `%${itemName}%`)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!sales || sales.length === 0) return false;

  const { error } = await supabase
    .from("sales")
    .delete()
    .eq("id", sales[0].id);

  if (error) throw error;
  return true;
}

export async function clearAllSales(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { error } = await supabase
    .from("sales")
    .delete()
    .eq("user_id", userId)
    .gte("created_at", today.toISOString());
  if (error) throw error;
  return true;
}

// ─── EXPENSES ─────────────────────────────────────────────
export async function recordExpense(data, language, userId) {
  const { error } = await supabase.from("expenses").insert([{
    user_id: userId,
    item: data.item,
    amount: data.amount,
    language
  }]);
  if (error) throw error;
  return true;
}

export async function deleteExpense(itemName, userId) {
  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .ilike("item", `%${itemName}%`)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!expenses || expenses.length === 0) return false;

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenses[0].id);

  if (error) throw error;
  return true;
}

export async function clearAllExpenses(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("user_id", userId)
    .gte("created_at", today.toISOString());
  if (error) throw error;
  return true;
}

// ─── CUSTOMERS ────────────────────────────────────────────
export async function getCustomerHistory(name, userId) {
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", `%${name}%`)
    .limit(1);

  if (!customers || customers.length === 0) return null;
  const customer = customers[0];

  const { data: transactions } = await supabase
    .from("customer_transactions")
    .select("*")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return { customer, transactions: transactions || [] };
}

// ─── SUMMARY ──────────────────────────────────────────────
export async function getDailySummary(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const { data: sales } = await supabase
    .from("sales").select("amount")
    .eq("user_id", userId)
    .gte("created_at", todayISO);

  const { data: expenses } = await supabase
    .from("expenses").select("amount")
    .eq("user_id", userId)
    .gte("created_at", todayISO);

  const totalSales = sales?.reduce((sum, s) => sum + s.amount, 0) || 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  return { totalSales, totalExpenses, profit: totalSales - totalExpenses };
}

export async function getWeeklyReport(userId) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString();

  const { data: sales } = await supabase
    .from("sales").select("amount, item")
    .eq("user_id", userId)
    .gte("created_at", weekAgoISO);

  const { data: expenses } = await supabase
    .from("expenses").select("amount")
    .eq("user_id", userId)
    .gte("created_at", weekAgoISO);

  const totalSales = sales?.reduce((sum, s) => sum + s.amount, 0) || 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  return { totalSales, totalExpenses, profit: totalSales - totalExpenses, salesCount: sales?.length || 0 };
}

// ─── FETCH FOR DASHBOARD ──────────────────────────────────
export async function fetchTodayData(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const { data: sales } = await supabase
    .from("sales").select("*")
    .eq("user_id", userId)
    .gte("created_at", todayISO)
    .order("created_at", { ascending: false });

  const { data: expenses } = await supabase
    .from("expenses").select("*")
    .eq("user_id", userId)
    .gte("created_at", todayISO)
    .order("created_at", { ascending: false });

  const totalSales = sales?.reduce((sum, s) => sum + s.amount, 0) || 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

  return {
    sales: sales || [],
    expenses: expenses || [],
    totalSales,
    totalExpenses,
    profit: totalSales - totalExpenses
  };
}
