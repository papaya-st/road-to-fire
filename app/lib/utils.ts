import { useEffect, useState } from "react";
import {
  CATEGORIES, MEMBERS, MONTHLY_BUDGET, Transaction, Member,
} from "./mockData";
import { supabase } from "./supabase";
import { getMonthTransactions as dbGetMonthTransactions } from "./db";
import { useAppContext } from "../context/AppContext";

export const WEEKEND_WEIGHT_OPTIONS = [
  { label: "同じ（×1.0）", value: 1.0 },
  { label: "1.25倍",        value: 1.25 },
  { label: "1.5倍",         value: 1.5 },
  { label: "2倍",           value: 2.0 },
  { label: "3倍",           value: 3.0 },
];

export function deduplicateConflicts(transactions: Transaction[]): Transaction[] {
  return transactions.filter((t) => {
    if (t.source !== "conflict") return true;
    if (!t.matchedId) return true;
    return t.id < t.matchedId;
  });
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Real-time hook: fetches transactions for the given month and subscribes to changes. */
export function useMonthTransactions(year: number, month: number): Transaction[] {
  const { familyCode } = useAppContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!familyCode) return;

    dbGetMonthTransactions(familyCode, year, month).then(setTransactions);

    const channel = supabase
      .channel(`tx:${familyCode}:${year}:${month}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `family_code=eq.${familyCode}`,
        },
        () => {
          dbGetMonthTransactions(familyCode, year, month).then(setTransactions);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [familyCode, year, month]);

  return transactions;
}

export function getTotalSpent(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

export function getRemainingBudget(spent: number, budget: number = MONTHLY_BUDGET): number {
  return budget - spent;
}

export function countRemainingDays(today: Date): { weekdays: number; weekends: number; total: number } {
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  let weekdays = 0, weekends = 0;
  for (let d = today.getDate(); d <= lastDay; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow === 0 || dow === 6) weekends++;
    else weekdays++;
  }
  return { weekdays, weekends, total: weekdays + weekends };
}

export function getDailyEstimates(
  remaining: number, today: Date, weekendWeight: number = 1.0
): { weekdayDaily: number; weekendDaily: number; weeklyEstimate: number; nextWeekendEstimate: number } {
  const { weekdays, weekends } = countRemainingDays(today);
  const weightedTotal = weekdays * 1 + weekends * weekendWeight;
  if (weightedTotal <= 0 || remaining <= 0)
    return { weekdayDaily: 0, weekendDaily: 0, weeklyEstimate: 0, nextWeekendEstimate: 0 };
  const base = remaining / weightedTotal;
  const weekdayDaily = Math.floor(base);
  const weekendDaily = Math.floor(base * weekendWeight);
  return { weekdayDaily, weekendDaily, weeklyEstimate: weekdayDaily * 5 + weekendDaily * 2, nextWeekendEstimate: weekendDaily * 2 };
}

export function getDailyEstimate(remaining: number, today: Date): number {
  return getDailyEstimates(remaining, today, 1.0).weekdayDaily;
}

export function getWeeklyEstimate(dailyEstimate: number): number { return dailyEstimate * 7; }
export function getWeekendEstimate(dailyEstimate: number): number { return dailyEstimate * 2; }

export function getCategoryById(id: string) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

export function getMemberById(id: string, memberList?: Member[]) {
  const members = memberList ?? MEMBERS;
  return members.find((m) => m.id === id) || members[0];
}

export function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function getCategoryBreakdown(transactions: Transaction[]) {
  const map: Record<string, number> = {};
  for (const t of transactions) map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
  return Object.entries(map)
    .map(([id, amount]) => ({ ...getCategoryById(id), amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function getMemberBreakdown(transactions: Transaction[], memberList?: Member[]) {
  const members = memberList ?? MEMBERS;
  const map: Record<string, number> = {};
  for (const t of transactions) map[t.memberId] = (map[t.memberId] || 0) + t.amount;
  return Object.entries(map)
    .map(([id, amount]) => ({ ...getMemberById(id, members), amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function getUsagePercent(spent: number, budget: number = MONTHLY_BUDGET): number {
  return Math.min((spent / budget) * 100, 100);
}

export function getBudgetStatus(percent: number): "safe" | "warning" | "danger" {
  if (percent < 70) return "safe";
  if (percent < 90) return "warning";
  return "danger";
}
