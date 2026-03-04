import { supabase } from "./supabase";
import type { Member, Transaction, RecurringItem } from "./mockData";

// ── Types ──────────────────────────────────────────────────────────────────

export type FamilySettings = {
  family_code: string;
  weekend_weight: number;
  monthly_budget: number;
  month_budgets: Record<string, number>;
  alerts: { p70: boolean; p90: boolean };
  salary_day: number;
  members: Member[];
};

// ── Settings ───────────────────────────────────────────────────────────────

export async function getSettings(familyCode: string): Promise<FamilySettings | null> {
  const { data, error } = await supabase
    .from("family_settings")
    .select("*")
    .eq("family_code", familyCode.toUpperCase())
    .maybeSingle();
  if (error) { console.error("getSettings:", error); return null; }
  return data as FamilySettings | null;
}

export async function upsertSettings(
  familyCode: string,
  patch: Partial<Omit<FamilySettings, "family_code">>
): Promise<void> {
  const { error } = await supabase
    .from("family_settings")
    .upsert(
      { family_code: familyCode.toUpperCase(), ...patch, updated_at: new Date().toISOString() },
      { onConflict: "family_code" }
    );
  if (error) console.error("upsertSettings:", error.message, error.code, error.details);
}

// ── Transactions ───────────────────────────────────────────────────────────

export async function getMonthTransactions(
  familyCode: string,
  year: number,
  month: number
): Promise<Transaction[]> {
  const mm   = String(month).padStart(2, "0");
  const from = `${year}-${mm}-01`;
  const to   = `${year}-${mm}-31`;
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("family_code", familyCode.toUpperCase())
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });
  if (error) { console.error("getMonthTransactions:", error); return []; }
  return (data ?? []).map(dbRowToTransaction);
}

export async function upsertTransaction(
  familyCode: string,
  tx: Transaction
): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .upsert(
      { ...transactionToDbRow(tx), family_code: familyCode.toUpperCase() },
      { onConflict: "family_code,id" }
    );
  if (error) console.error("upsertTransaction:", error);
}

export async function upsertManyTransactions(
  familyCode: string,
  txs: Transaction[]
): Promise<void> {
  if (txs.length === 0) return;
  const rows = txs.map((tx) => ({
    ...transactionToDbRow(tx),
    family_code: familyCode.toUpperCase(),
  }));
  const { error } = await supabase
    .from("transactions")
    .upsert(rows, { onConflict: "family_code,id" });
  if (error) console.error("upsertManyTransactions:", error);
}

export async function deleteTransaction(
  familyCode: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("family_code", familyCode.toUpperCase())
    .eq("id", id);
  if (error) console.error("deleteTransaction:", error);
}

// ── Recurring Items ────────────────────────────────────────────────────────

export async function getRecurringItems(familyCode: string): Promise<RecurringItem[]> {
  const { data, error } = await supabase
    .from("recurring_items")
    .select("*")
    .eq("family_code", familyCode.toUpperCase());
  if (error) { console.error("getRecurringItems:", error); return []; }
  return (data ?? []).map(dbRowToRecurring);
}

export async function upsertRecurringItem(
  familyCode: string,
  item: RecurringItem
): Promise<void> {
  const { error } = await supabase
    .from("recurring_items")
    .upsert(
      { ...recurringToDbRow(item), family_code: familyCode.toUpperCase() },
      { onConflict: "family_code,id" }
    );
  if (error) console.error("upsertRecurringItem:", error);
}

export async function deleteRecurringItem(
  familyCode: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("recurring_items")
    .delete()
    .eq("family_code", familyCode.toUpperCase())
    .eq("id", id);
  if (error) console.error("deleteRecurringItem:", error);
}

// ── Column mapping helpers ─────────────────────────────────────────────────

function transactionToDbRow(tx: Transaction) {
  return {
    id:          tx.id,
    date:        tx.date,
    amount:      tx.amount,
    merchant:    tx.merchant,
    category_id: tx.categoryId,
    member_id:   tx.memberId,
    memo:        tx.memo ?? null,
    source:      tx.source,
    matched_id:  tx.matchedId ?? null,
  };
}

function dbRowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id:         row.id as string,
    date:       (row.date as string).slice(0, 10), // strip time if present
    amount:     row.amount as number,
    merchant:   row.merchant as string,
    categoryId: row.category_id as string,
    memberId:   row.member_id as string,
    memo:       (row.memo as string) || undefined,
    source:     row.source as Transaction["source"],
    matchedId:  (row.matched_id as string) || undefined,
  };
}

function recurringToDbRow(r: RecurringItem) {
  return {
    id:           r.id,
    name:         r.name,
    amount:       r.amount,
    category_id:  r.categoryId,
    member_id:    r.memberId,
    day_of_month: r.dayOfMonth,
  };
}

function dbRowToRecurring(row: Record<string, unknown>): RecurringItem {
  return {
    id:          row.id as string,
    name:        row.name as string,
    amount:      row.amount as number,
    categoryId:  row.category_id as string,
    memberId:    row.member_id as string,
    dayOfMonth:  row.day_of_month as number,
  };
}
