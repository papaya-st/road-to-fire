"use client";
import { useMemo, useState } from "react";
import { Bell, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import {
  useMonthTransactions,
  getTotalSpent,
  getDailyEstimates,
  getCategoryBreakdown,
  getMemberBreakdown,
  formatAmount,
  getUsagePercent,
  getBudgetStatus,
  deduplicateConflicts,
  WEEKEND_WEIGHT_OPTIONS,
} from "./lib/utils";
import { useAppContext } from "./context/AppContext";

export default function HomePage() {
  const realToday = new Date();
  const realYear  = realToday.getFullYear();
  const realMonth = realToday.getMonth() + 1;

  const { weekendWeight, setWeekendWeight, viewYear, viewMonth, prevMonth, nextMonth, getMonthBudget, members } = useAppContext();
  const currentMonthBudget = getMonthBudget(viewYear, viewMonth);
  const [showWeightPicker, setShowWeightPicker] = useState(false);

  const isCurrentMonth = viewYear === realYear && viewMonth === realMonth;
  const isPastMonth    = viewYear * 12 + viewMonth < realYear * 12 + realMonth;

  const rawTransactions = useMonthTransactions(viewYear, viewMonth);
  const transactions    = useMemo(() => deduplicateConflicts(rawTransactions), [rawTransactions]);
  const totalSpent      = useMemo(() => getTotalSpent(transactions), [transactions]);
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(transactions), [transactions]);
  const memberBreakdown   = useMemo(() => getMemberBreakdown(transactions, members), [transactions, members]);

  const remaining = useMemo(() => currentMonthBudget - totalSpent, [totalSpent, currentMonthBudget]);
  const percent   = useMemo(() => getUsagePercent(totalSpent, currentMonthBudget), [totalSpent, currentMonthBudget]);
  const status    = useMemo(() => getBudgetStatus(percent), [percent]);
  const isOver    = totalSpent > currentMonthBudget;

  const dailyEstimates = useMemo(() => {
    if (!isCurrentMonth) return { weekdayDaily: 0, weekendDaily: 0, weeklyEstimate: 0, nextWeekendEstimate: 0 };
    return getDailyEstimates(Math.max(0, remaining), realToday, weekendWeight);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, weekendWeight, isCurrentMonth, currentMonthBudget]);

  const selectedLabel = WEEKEND_WEIGHT_OPTIONS.find((o) => o.value === weekendWeight)?.label ?? "";

  const heroGradient = isOver
    ? "linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)"
    : status === "danger"
    ? "linear-gradient(135deg, #4C1D95 0%, #6D28D9 60%, #7C3AED 100%)"
    : status === "warning"
    ? "linear-gradient(135deg, #5B21B6 0%, #7C3AED 60%, #9333EA 100%)"
    : "linear-gradient(135deg, #4F46E5 0%, #7C3AED 60%, #9E8CFC 100%)";

  const heroShadow = isOver
    ? "0 20px 60px rgba(185,28,28,0.32)"
    : status === "danger"
    ? "0 20px 60px rgba(109,40,217,0.32)"
    : status === "warning"
    ? "0 20px 60px rgba(124,58,237,0.30)"
    : "0 20px 60px rgba(79,70,229,0.28)";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              className="glass w-7 h-7 flex items-center justify-center rounded-full"
            >
              <ChevronLeft size={13} className="text-gray-500" />
            </button>
            <span className="text-sm text-gray-600 font-semibold min-w-[80px] text-center">
              {viewYear}年{viewMonth}月
            </span>
            <button
              onClick={nextMonth}
              className="glass w-7 h-7 flex items-center justify-center rounded-full"
            >
              <ChevronRight size={13} className="text-gray-500" />
            </button>
          </div>
          <button className="glass w-9 h-9 rounded-full flex items-center justify-center">
            <Bell size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="flex items-center gap-2.5 mt-1">
          {/* Rocket illustration */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="14" fill="url(#rocketBg)"/>
            <defs>
              <linearGradient id="rocketBg" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4F46E5"/>
                <stop offset="1" stopColor="#7C3AED"/>
              </linearGradient>
            </defs>
            <path d="M14 6C14 6 10 10 10 15C10 17.2 10.8 19.2 12.2 20.7L13 21.5V24L14 23L15 24V21.5L15.8 20.7C17.2 19.2 18 17.2 18 15C18 10 14 6 14 6Z" fill="white" opacity="0.95"/>
            <ellipse cx="14" cy="15" rx="2" ry="2.5" fill="url(#rocketBg)"/>
            <path d="M10 17L8 19L10 18Z" fill="white" opacity="0.7"/>
            <path d="M18 17L20 19L18 18Z" fill="white" opacity="0.7"/>
            <circle cx="14" cy="9" r="1.5" fill="url(#rocketBg)" opacity="0.8"/>
          </svg>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ background: "linear-gradient(135deg, #312E81 0%, #4F46E5 50%, #7C3AED 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Road to FIRE</h1>
            <p className="text-xs text-gray-400 mt-0.5 tracking-wide">経済的自立・早期リタイアへの家計管理</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3 pb-4">
        {/* Budget Hero Card */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 text-white"
          style={{ background: heroGradient, boxShadow: heroShadow }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/8 pointer-events-none" />
          <div className="absolute top-6 right-20 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
          {/* Money / chart illustration */}
          <svg className="absolute bottom-4 right-4 opacity-20 pointer-events-none" width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect x="4" y="44" width="8" height="16" rx="2" fill="white"/>
            <rect x="16" y="34" width="8" height="26" rx="2" fill="white"/>
            <rect x="28" y="24" width="8" height="36" rx="2" fill="white"/>
            <rect x="40" y="30" width="8" height="30" rx="2" fill="white"/>
            <rect x="52" y="18" width="8" height="42" rx="2" fill="white"/>
            <path d="M8 42 L20 32 L32 22 L44 28 L56 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <circle cx="56" cy="16" r="3" fill="white"/>
          </svg>

          <p className="text-sm font-medium text-white/80 relative z-10">今月の予算（変動費）</p>
          <div className="mt-1 relative z-10 flex items-end gap-2">
            <span className="text-4xl font-bold font-num tracking-tight">{formatAmount(totalSpent)}</span>
            <span className="text-white/60 text-sm mb-1 font-num">/ {formatAmount(currentMonthBudget)}</span>
          </div>

          {/* Progress track */}
          <div className="mt-5 mb-2 h-1.5 bg-white/20 rounded-full overflow-hidden relative z-10">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(percent, 100)}%`,
                background: isOver ? "#FECACA" : "rgba(255,255,255,0.88)",
              }}
            />
          </div>

          <div className="flex justify-between text-sm relative z-10">
            <span className="text-white/70 font-medium">{percent.toFixed(1)}% 使用</span>
            <span className="font-bold text-white">
              {isOver ? `超過 ${formatAmount(Math.abs(remaining))}` : `残り ${formatAmount(remaining)}`}
            </span>
          </div>
        </div>

        {/* Alert Banner */}
        {(isOver || status !== "safe") && (
          <div
            className={`p-4 rounded-2xl flex items-start gap-3 ${
              isOver
                ? "bg-red-50 border border-red-100"
                : status === "warning"
                ? "bg-violet-50 border border-violet-100"
                : "bg-purple-50 border border-purple-100"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isOver ? "bg-red-100" : status === "warning" ? "bg-violet-100" : "bg-purple-100"
              }`}
            >
              <AlertTriangle
                size={15}
                className={isOver ? "text-red-500" : status === "warning" ? "text-violet-500" : "text-purple-500"}
              />
            </div>
            <div>
              <p
                className={`text-xs font-bold mb-0.5 ${
                  isOver ? "text-red-700" : status === "warning" ? "text-violet-700" : "text-purple-700"
                }`}
              >
                {isOver ? "予算超過" : status === "warning" ? "注意" : "危険域"}
              </p>
              <p
                className={`text-xs leading-relaxed ${
                  isOver ? "text-red-600" : status === "warning" ? "text-violet-600" : "text-purple-600"
                }`}
              >
                {isOver
                  ? `今月の予算を ${formatAmount(Math.abs(remaining))} 超過しています。`
                  : status === "warning"
                  ? "予算の70%を超えました。残り少なくなっています。"
                  : "予算の90%を超えました！支出を控えましょう。"}
              </p>
            </div>
          </div>
        )}

        {/* Weekend weight picker */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">土日の予算ウェイト</p>
              <p className="text-xs text-gray-400 mt-0.5">平日より多く使う日の倍率</p>
            </div>
            <button
              onClick={() => setShowWeightPicker(!showWeightPicker)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 transition-colors hover:bg-indigo-100"
            >
              🏖️ {selectedLabel}
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${showWeightPicker ? "rotate-180" : ""}`}
              />
            </button>
          </div>
          {showWeightPicker && (
            <div className="mt-3 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.7)" }}>
              {WEEKEND_WEIGHT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setWeekendWeight(opt.value); setShowWeightPicker(false); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm border-b border-gray-100 last:border-0 transition-colors ${
                    weekendWeight === opt.value
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-gray-700 hover:bg-white"
                  }`}
                >
                  <span>{opt.label}</span>
                  {weekendWeight === opt.value && (
                    <span className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[9px]">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Daily estimates */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 5.5C10.5 3.29 8.71 1.5 6.5 1.5C4.29 1.5 2.5 3.29 2.5 5.5C2.5 7.1 3.38 8.49 4.68 9.23L4.5 11.5H8.5L8.32 9.23C9.62 8.49 10.5 7.1 10.5 5.5Z" fill="#7C3AED" opacity="0.7"/><path d="M5.5 9.5V11H8.5V9.5" stroke="#4F46E5" strokeWidth="0.8" fill="none"/><circle cx="8" cy="5" r="0.8" fill="white"/><path d="M10.5 5.5H12" stroke="#7C3AED" strokeWidth="1" strokeLinecap="round"/></svg>
            <h2 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">残り予算の目安</h2>
          </div>
          {!isCurrentMonth ? (
            <div className="glass rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={22} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-500">
                {isPastMonth ? "この月は終了しています" : "まだ始まっていない月です"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {isPastMonth ? `最終支出: ${formatAmount(totalSpent)}` : `予算: ${formatAmount(currentMonthBudget)}`}
              </p>
            </div>
          ) : isOver ? (
            <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(254,226,226,0.75)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", border: "1px solid rgba(252,165,165,0.5)" }}>
              <p className="text-3xl font-bold text-red-500 font-num">{formatAmount(Math.abs(remaining))}</p>
              <p className="text-xs text-red-400 mt-1">超過中 — 支出を抑えましょう</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "平日1日あたり", value: dailyEstimates.weekdayDaily,       icon: "📅", accent: "#4F46E5" },
                { label: "土日1日あたり", value: dailyEstimates.weekendDaily,        icon: "🏖️", accent: "#7C3AED" },
                { label: "今週の目安",    value: dailyEstimates.weeklyEstimate,      icon: "📆", accent: "#0891B2" },
                { label: "週末2日合計",  value: dailyEstimates.nextWeekendEstimate,  icon: "🎉", accent: "#D97706" },
              ].map(({ label, value, icon, accent }) => (
                <div key={label} className="glass rounded-2xl p-4 relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: accent }}
                  />
                  <p className="text-2xl mb-2">{icon}</p>
                  <p className="text-xl font-bold text-gray-900 font-num">{formatAmount(value)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="#4F46E5" opacity="0.15"/><path d="M7 3L8.5 6H11L9 8L9.8 11L7 9.5L4.2 11L5 8L3 6H5.5Z" fill="#4F46E5" opacity="0.8"/></svg>
            <h2 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">カテゴリ別</h2>
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            {categoryBreakdown.slice(0, 5).map((c, i) => {
              const pct = totalSpent > 0 ? (c.amount / totalSpent) * 100 : 0;
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${
                    i !== Math.min(categoryBreakdown.length, 5) - 1 ? "border-b border-white/50" : ""
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: c.color + "18" }}
                  >
                    {c.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{c.name}</span>
                      <span className="text-sm font-bold text-gray-900 font-num">{formatAmount(c.amount)}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Member breakdown */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4.5" r="2" fill="#7C3AED" opacity="0.7"/><circle cx="9.5" cy="4.5" r="1.5" fill="#4F46E5" opacity="0.55"/><path d="M1 11C1 9 2.8 7.5 5 7.5C7.2 7.5 9 9 9 11" stroke="#7C3AED" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.8"/><path d="M9 8.5C10.2 8.5 12 9.4 12 11" stroke="#4F46E5" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6"/></svg>
            <h2 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">メンバー別</h2>
          </div>
          <div className="glass rounded-2xl overflow-hidden mb-4">
            {memberBreakdown.map((m, i) => {
              const pct = totalSpent > 0 ? (m.amount / totalSpent) * 100 : 0;
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${
                    i !== memberBreakdown.length - 1 ? "border-b border-white/50" : ""
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${m.color} 0%, ${m.color}BB 100%)`,
                      boxShadow: `0 3px 10px ${m.color}40`,
                    }}
                  >
                    {m.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm font-semibold text-gray-700">{m.name}</span>
                      <span className="text-sm font-bold text-gray-900 font-num">{formatAmount(m.amount)}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: m.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
