"use client";
import {
  createContext, useContext, useState, useCallback,
  useEffect, ReactNode,
} from "react";
import { Member, MEMBERS } from "../lib/mockData";
import { supabase, initFamilySession, FAMILY_CODE_KEY } from "../lib/supabase";
import { getSettings, upsertSettings, FamilySettings } from "../lib/db";
import FamilySetup from "../components/FamilySetup";

// ── Types ──────────────────────────────────────────────────────────────────

type AppContextType = {
  familyCode: string;
  weekendWeight: number;
  setWeekendWeight: (v: number) => void;
  monthlyBudget: number;
  setMonthlyBudget: (v: number) => void;
  viewYear: number;
  viewMonth: number;
  prevMonth: () => void;
  nextMonth: () => void;
  members: Member[];
  setMembers: (m: Member[]) => void;
  monthBudgets: Record<string, number>;
  setMonthBudget: (year: number, month: number, v: number) => void;
  getMonthBudget: (year: number, month: number) => number;
  alerts: { p70: boolean; p90: boolean };
  setAlerts: (a: { p70: boolean; p90: boolean }) => void;
  salaryDay: number;
  setSalaryDay: (d: number) => void;
};

const _today = new Date();

const AppContext = createContext<AppContextType>({
  familyCode: "",
  weekendWeight: 1.5,    setWeekendWeight: () => {},
  monthlyBudget: 150000, setMonthlyBudget: () => {},
  viewYear: _today.getFullYear(), viewMonth: _today.getMonth() + 1,
  prevMonth: () => {},   nextMonth: () => {},
  members: MEMBERS,      setMembers: () => {},
  monthBudgets: {},      setMonthBudget: () => {},
  getMonthBudget: () => 150000,
  alerts: { p70: true, p90: true }, setAlerts: () => {},
  salaryDay: 25,         setSalaryDay: () => {},
});

// ── Provider ───────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  // Family code (persisted in localStorage, not synced)
  const [familyCode, setFamilyCode] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(FAMILY_CODE_KEY) ?? "";
  });

  // Settings state (populated from Supabase on mount)
  const [weekendWeight, setWeekendWeightState] = useState<number>(1.5);
  const [monthlyBudget, setMonthlyBudgetState] = useState<number>(150000);
  const [members, setMembersState]             = useState<Member[]>(MEMBERS);
  const [monthBudgets, setMonthBudgetsState]   = useState<Record<string, number>>({});
  const [alerts, setAlertsState]               = useState<{ p70: boolean; p90: boolean }>({ p70: true, p90: true });
  const [salaryDay, setSalaryDayState]         = useState<number>(25);
  const [loaded, setLoaded]                    = useState(false);

  const [viewDate, setViewDate] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() + 1 };
  });

  // Apply settings from a Supabase row to local state
  const applySettings = (s: FamilySettings) => {
    setWeekendWeightState(s.weekend_weight ?? 1.5);
    setMonthlyBudgetState(s.monthly_budget ?? 150000);
    setMembersState(
      Array.isArray(s.members) && s.members.length > 0 ? s.members : MEMBERS
    );
    setMonthBudgetsState((s.month_budgets as Record<string, number>) ?? {});
    setAlertsState(
      (s.alerts as { p70: boolean; p90: boolean }) ?? { p70: true, p90: true }
    );
    setSalaryDayState(s.salary_day ?? 25);
  };

  // Load settings from Supabase when familyCode is known, and subscribe to changes
  useEffect(() => {
    if (!familyCode) return;
    let cancelled = false;

    (async () => {
      await initFamilySession(familyCode);
      const settings = await getSettings(familyCode);
      if (cancelled) return;

      if (settings) {
        applySettings(settings);
      } else {
        // First time this family code is used — create defaults
        await upsertSettings(familyCode, {
          weekend_weight: 1.5,
          monthly_budget: 150000,
          month_budgets: {},
          alerts: { p70: true, p90: true },
          salary_day: 25,
          members: MEMBERS,
        });
      }
      setLoaded(true);
    })();

    // Real-time subscription: when any family member changes settings,
    // this tab updates instantly.
    const channel = supabase
      .channel(`settings:${familyCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "family_settings",
          filter: `family_code=eq.${familyCode}`,
        },
        (payload) => {
          if (!cancelled) applySettings(payload.new as FamilySettings);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [familyCode]);

  // ── Setters (write local state + Supabase) ─────────────────────────────
  const setWeekendWeight = useCallback((v: number) => {
    setWeekendWeightState(v);
    if (familyCode) upsertSettings(familyCode, { weekend_weight: v });
  }, [familyCode]);

  const setMonthlyBudget = useCallback((v: number) => {
    setMonthlyBudgetState(v);
    if (familyCode) upsertSettings(familyCode, { monthly_budget: v });
  }, [familyCode]);

  const setMembers = useCallback((m: Member[]) => {
    setMembersState(m);
    if (familyCode) upsertSettings(familyCode, { members: m });
  }, [familyCode]);

  const setMonthBudget = useCallback((year: number, month: number, v: number) => {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    setMonthBudgetsState((prev) => {
      const next = { ...prev, [key]: v };
      if (familyCode) upsertSettings(familyCode, { month_budgets: next });
      return next;
    });
  }, [familyCode]);

  const getMonthBudget = useCallback((year: number, month: number): number => {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    return monthBudgets[key] ?? monthlyBudget;
  }, [monthBudgets, monthlyBudget]);

  const setAlerts = useCallback((a: { p70: boolean; p90: boolean }) => {
    setAlertsState(a);
    if (familyCode) upsertSettings(familyCode, { alerts: a });
  }, [familyCode]);

  const setSalaryDay = useCallback((d: number) => {
    setSalaryDayState(d);
    if (familyCode) upsertSettings(familyCode, { salary_day: d });
  }, [familyCode]);

  const prevMonth = () => setViewDate(({ year, month }) =>
    month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 });
  const nextMonth = () => setViewDate(({ year, month }) =>
    month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 });

  // ── Render ─────────────────────────────────────────────────────────────
  if (!familyCode) {
    return <FamilySetup onCodeSet={(code) => setFamilyCode(code)} />;
  }

  if (!loaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      familyCode,
      weekendWeight, setWeekendWeight,
      monthlyBudget, setMonthlyBudget,
      viewYear: viewDate.year, viewMonth: viewDate.month,
      prevMonth, nextMonth,
      members, setMembers,
      monthBudgets, setMonthBudget, getMonthBudget,
      alerts, setAlerts,
      salaryDay, setSalaryDay,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() { return useContext(AppContext); }
