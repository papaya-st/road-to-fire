"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMonthTransactions, getTotalSpent, formatAmount, getCategoryById } from "../lib/utils";
import { useAppContext } from "../context/AppContext";

const DOW = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarPage() {
  const { viewYear, viewMonth, prevMonth, nextMonth, members } = useAppContext();

  const transactions = useMonthTransactions(viewYear, viewMonth);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

  const dailyMap = useMemo(() => {
    const map: Record<number, number> = {};
    for (const t of transactions) {
      const day = parseInt(t.date.split("-")[2], 10);
      map[day] = (map[day] || 0) + t.amount;
    }
    return map;
  }, [transactions]);

  const maxDaily = Math.max(...Object.values(dailyMap), 1);

  const selectedTxs = useMemo(() => {
    if (selectedDay === null) return [];
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    return transactions.filter((t) => t.date === dateStr).sort((a, b) => b.amount - a.amount);
  }, [selectedDay, transactions, viewYear, viewMonth]);

  const totalSpent = useMemo(() => getTotalSpent(transactions), [transactions]);

  return (
    <div className="min-h-screen">
      <div className="glass-header px-4 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">カレンダー</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              今月合計 <span className="font-bold text-indigo-600 font-num">{formatAmount(totalSpent)}</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="glass w-7 h-7 flex items-center justify-center rounded-full">
              <ChevronLeft size={13} className="text-gray-500" />
            </button>
            <span className="text-sm text-gray-600 font-semibold">{viewYear}年{viewMonth}月</span>
            <button onClick={nextMonth} className="glass w-7 h-7 flex items-center justify-center rounded-full">
              <ChevronRight size={13} className="text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 py-3">
        <div className="glass rounded-2xl overflow-hidden">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DOW.map((d, i) => (
              <div key={d} className={`text-center py-2.5 text-xs font-bold ${
                i === 0 ? "text-red-400" : i === 6 ? "text-indigo-500" : "text-gray-400"
              }`}>{d}</div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`empty-${i}`} className="border-b border-r border-white/40 min-h-[54px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const amount = dailyMap[day] || 0;
              const today = new Date();
              const isToday = viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1 && day === today.getDate();
              const isSelected = selectedDay === day;
              const dow = (firstDow + i) % 7;
              const intensity = amount > 0 ? Math.max(0.08, (amount / maxDaily) * 0.55) : 0;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`border-b border-r border-white/40 min-h-[54px] p-1.5 cursor-pointer transition-colors ${
                    isSelected ? "bg-indigo-50" : "hover:bg-white/30"
                  }`}
                  style={amount > 0 && !isSelected ? { backgroundColor: `rgba(99, 102, 241, ${intensity})` } : {}}
                >
                  <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? "text-white"
                      : dow === 0
                      ? "text-red-400"
                      : dow === 6
                      ? "text-indigo-500"
                      : "text-gray-600"
                  }`}
                  style={isToday ? { background: "linear-gradient(135deg, #4F46E5, #7C3AED)" } : {}}>
                    {day}
                  </div>
                  {amount > 0 && (
                    <div className="text-[9px] font-bold text-indigo-700 leading-tight">
                      {amount >= 10000 ? `${(amount / 10000).toFixed(1)}万` : `${(amount / 1000).toFixed(1)}k`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 選択日の明細 */}
        {selectedDay !== null && (
          <div className="mt-3">
            <p className="text-xs font-bold text-gray-500 mb-2 px-0.5">
              {viewMonth}月{selectedDay}日の支出
              {selectedTxs.length > 0 && (
                <span className="ml-2 text-indigo-600 font-num">{formatAmount(selectedTxs.reduce((s, t) => s + t.amount, 0))}</span>
              )}
            </p>
            {selectedTxs.length === 0 ? (
              <div className="glass rounded-2xl p-4 text-center">
                <p className="text-xs text-gray-400">この日の支出はありません</p>
              </div>
            ) : (
              <div className="glass rounded-2xl overflow-hidden">
                {selectedTxs.map((tx, i) => {
                  const cat = getCategoryById(tx.categoryId);
                  const member = members.find((m) => m.id === tx.memberId) || members[0];
                  return (
                    <div key={tx.id} className={`flex items-center gap-3 px-4 py-3 ${i !== selectedTxs.length - 1 ? "border-b border-white/50" : ""}`}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                        style={{ backgroundColor: cat.color + "18" }}>{cat.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{tx.merchant}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: cat.color + "18", color: cat.color }}>{cat.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium text-[10px]"
                            style={{ backgroundColor: member.color }}>{member.name}</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 font-num">{formatAmount(tx.amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
