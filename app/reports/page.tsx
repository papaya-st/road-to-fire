"use client";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
  ComposedChart, ReferenceLine, Line,
} from "recharts";
import {
  useMonthTransactions,
  getTotalSpent,
  getCategoryBreakdown,
  getMemberBreakdown,
  formatAmount,
  getUsagePercent,
  deduplicateConflicts,
} from "../lib/utils";
import { PAST_MONTHS } from "../lib/mockData";
import { useAppContext } from "../context/AppContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ReportsPage() {
  const [tab, setTab] = useState<"monthly" | "yearly">("monthly");
  const { viewYear, viewMonth, prevMonth, nextMonth, getMonthBudget, members } = useAppContext();
  const monthlyBudget = getMonthBudget(viewYear, viewMonth);

  const rawTransactions   = useMonthTransactions(viewYear, viewMonth);
  const transactions      = useMemo(() => deduplicateConflicts(rawTransactions), [rawTransactions]);
  const totalSpent        = useMemo(() => getTotalSpent(transactions), [transactions]);
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(transactions), [transactions]);
  const memberBreakdown   = useMemo(() => getMemberBreakdown(transactions, members), [transactions, members]);
  const usagePercent      = useMemo(() => getUsagePercent(totalSpent, monthlyBudget), [totalSpent, monthlyBudget]);
  const isOver            = totalSpent > monthlyBudget;

  const yearlyData = useMemo(() => [
    ...PAST_MONTHS.map((m) => ({ label: m.month.slice(5) + "月", amount: m.total, budget: monthlyBudget })),
    { label: `${viewMonth}月`, amount: totalSpent, budget: monthlyBudget },
  ], [totalSpent, viewMonth, monthlyBudget]);

  const dailyData = useMemo(() => {
    const lastDay = new Date(viewYear, viewMonth, 0).getDate();
    const map: Record<number, number> = {};
    for (const t of transactions) {
      const day = parseInt(t.date.split("-")[2], 10);
      map[day] = (map[day] || 0) + t.amount;
    }
    let cumulative = 0;
    return Array.from({ length: lastDay }, (_, i) => {
      const day = i + 1;
      const amount = map[day] || 0;
      cumulative += amount;
      return { day: String(day), amount, cumulative };
    });
  }, [transactions, viewYear, viewMonth]);

  // Refined palette — indigo/violet/teal
  const COLORS = ["#4F46E5", "#7C3AED", "#0891B2", "#D97706", "#10B981", "#EC4899", "#EF4444", "#64748b"];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<any>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-2.5 text-xs border border-gray-100">
          <p className="font-semibold text-gray-600 mb-1">{label}日</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color ?? "#4F46E5" }} className="font-bold font-num">
              {p.name}: {formatAmount(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const YearlyTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<any>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-2.5 text-xs border border-gray-100">
          <p className="font-semibold text-gray-600 mb-1">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="text-gray-800 font-bold font-num">{formatAmount(p.value)}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen">
      <div className="glass-header px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">レポート</h1>
          {tab === "monthly" && (
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="glass w-7 h-7 flex items-center justify-center rounded-full">
                <ChevronLeft size={13} className="text-gray-500" />
              </button>
              <span className="text-sm text-gray-600 font-semibold">{viewYear}年{viewMonth}月</span>
              <button onClick={nextMonth} className="glass w-7 h-7 flex items-center justify-center rounded-full">
                <ChevronRight size={13} className="text-gray-500" />
              </button>
            </div>
          )}
        </div>
        <div className="flex rounded-xl p-0.5" style={{ background: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.7)" }}>
          {(["monthly", "yearly"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === t
                  ? "text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={tab === t ? { background: "linear-gradient(135deg, #4F46E5, #7C3AED)" } : {}}
            >
              {t === "monthly" ? "月間レポート" : "年間推移"}
            </button>
          ))}
        </div>
      </div>

      {tab === "monthly" ? (
        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-1.5">今月の支出</p>
              <p className="text-xl font-bold text-gray-900 font-num">{formatAmount(totalSpent)}</p>
              <p className="text-xs text-gray-400 mt-1 font-num">/ {formatAmount(monthlyBudget)}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: isOver ? "rgba(254,226,226,0.75)" : "rgba(238,242,255,0.78)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", border: isOver ? "1px solid rgba(252,165,165,0.5)" : "1px solid rgba(199,210,254,0.55)" }}>
              <p className={`text-xs mb-1.5 font-medium ${isOver ? "text-red-400" : "text-indigo-500"}`}>残り予算</p>
              <p className={`text-xl font-bold font-num ${isOver ? "text-red-500" : "text-indigo-600"}`}>
                {isOver ? `超過 ${formatAmount(totalSpent - monthlyBudget)}` : formatAmount(monthlyBudget - totalSpent)}
              </p>
              <p className={`text-xs mt-1 font-num ${isOver ? "text-red-400" : "text-indigo-400"}`}>{usagePercent.toFixed(1)}% 使用</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-1">日別支出トレンド</h3>
            <div className="flex items-center gap-3 mb-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm bg-indigo-200" />棒: 日別
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 border-t-2 border-indigo-500" />線: 累計
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 border-t-2 border-dashed border-red-400" />予算
              </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={dailyData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#9ca3af" }} interval={4} />
                <YAxis yAxisId="bar" tick={{ fontSize: 9, fill: "#9ca3af" }}
                  tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${(v / 1000).toFixed(0)}k`} width={28} />
                <YAxis yAxisId="line" orientation="right" tick={{ fontSize: 9, fill: "#9ca3af" }}
                  tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : ""} width={28} />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="bar" dataKey="amount" fill="#c7d2fe" radius={[3, 3, 0, 0]} name="1日の支出" />
                <Line yAxisId="line" type="monotone" dataKey="cumulative" stroke="#4F46E5" strokeWidth={2.5} dot={false} name="月累計" />
                <ReferenceLine yAxisId="line" y={monthlyBudget} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} label="" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">カテゴリ別支出</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="amount" nameKey="name" paddingAngle={2}>
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={entry.id} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<YearlyTooltip />} />
                <Legend formatter={(value) => <span className="text-xs text-gray-600">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-white/50">
              <h3 className="text-sm font-bold text-gray-800">カテゴリ詳細</h3>
            </div>
            {categoryBreakdown.map((c, idx) => {
              const pct = totalSpent > 0 ? (c.amount / totalSpent) * 100 : 0;
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-white/50 last:border-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] + "20" }}>{c.icon}</div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{c.name}</span>
                      <span className="text-sm font-bold text-gray-900 font-num">{formatAmount(c.amount)}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[idx % COLORS.length] }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{pct.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass rounded-2xl overflow-hidden mb-2">
            <div className="px-4 py-3.5 border-b border-white/50">
              <h3 className="text-sm font-bold text-gray-800">メンバー別支出</h3>
            </div>
            {memberBreakdown.map((m) => {
              const pct = totalSpent > 0 ? (m.amount / totalSpent) * 100 : 0;
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-white/50 last:border-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${m.color} 0%, ${m.color}BB 100%)`,
                      boxShadow: `0 3px 10px ${m.color}40`,
                    }}
                  >
                    {m.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{m.name}</span>
                      <span className="text-sm font-bold text-gray-900 font-num">{formatAmount(m.amount)}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: m.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">月別支出推移</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={yearlyData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={(v) => `${v / 10000}万`} />
                <Tooltip content={<YearlyTooltip />} />
                <Bar dataKey="amount" fill="#6366f1" radius={[5, 5, 0, 0]} name="支出" />
                <Bar dataKey="budget" fill="#e0e7ff" radius={[5, 5, 0, 0]} name="予算" opacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-white/50">
              <h3 className="text-sm font-bold text-gray-800">月別サマリー</h3>
            </div>
            {yearlyData.map((d, i) => {
              const over = d.amount > monthlyBudget;
              const pct = Math.min((d.amount / monthlyBudget) * 100, 100);
              return (
                <div key={i} className="px-4 py-3.5 border-b border-white/50 last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-600">{d.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold font-num ${over ? "text-red-500" : "text-gray-800"}`}>{formatAmount(d.amount)}</span>
                      {over && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full font-semibold">超過</span>}
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full`} style={{ width: `${pct}%`, backgroundColor: over ? "#EF4444" : "#6366f1" }} />
                  </div>
                </div>
              );
            })}
            <div className="px-4 py-3.5 flex justify-between border-t border-white/50" style={{ background: "rgba(238,242,255,0.6)" }}>
              <span className="text-sm font-semibold text-indigo-700">合計</span>
              <span className="text-sm font-bold text-gray-900 font-num">{formatAmount(yearlyData.reduce((s, d) => s + d.amount, 0))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
