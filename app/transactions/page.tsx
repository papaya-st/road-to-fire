"use client";
import { useMemo, useState, useEffect } from "react";
import {
  ChevronRight, ChevronLeft, X, Check, Plus, AlertTriangle,
  Mail, PenLine, CheckCircle2, Download, RefreshCw, Repeat,
} from "lucide-react";
import {
  useMonthTransactions,
  getCategoryById,
  getMemberById,
  formatAmount,
  formatDate,
  toDateString,
  getTotalSpent,
} from "../lib/utils";
import { CATEGORIES, Transaction, TransactionSource, RecurringItem } from "../lib/mockData";
import { useAppContext } from "../context/AppContext";
import {
  upsertTransaction,
  upsertManyTransactions,
  deleteTransaction,
  getRecurringItems,
} from "../lib/db";

function findMatch(incoming: Transaction, existing: Transaction[]): Transaction | null {
  return existing.find((t) => {
    if (t.source !== "manual") return false;
    if (t.amount !== incoming.amount) return false;
    if (t.merchant.toLowerCase() !== incoming.merchant.toLowerCase()) return false;
    const diff = Math.abs(new Date(t.date).getTime() - new Date(incoming.date).getTime());
    return diff <= 1000 * 60 * 60 * 24;
  }) ?? null;
}

const SOURCE_CONFIG: Record<TransactionSource, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  email:     { label: "メール確定", color: "#06b6d4", bg: "#ecfeff", icon: <Mail size={10} /> },
  manual:    { label: "手動入力",   color: "#3b82f6", bg: "#eff6ff", icon: <PenLine size={10} /> },
  confirmed: { label: "照合済み",   color: "#10b981", bg: "#f0fdf4", icon: <CheckCircle2 size={10} /> },
  conflict:  { label: "要確認",     color: "#ef4444", bg: "#fef2f2", icon: <AlertTriangle size={10} /> },
};

function parseRakutenEmail(text: string): {
  date: string; merchant: string; amount: number; cardSuffix: string;
} | null {
  const amountMatch = text.match(/([0-9,，]+)円/);
  const merchantMatch2 = text.match(/(?:日に|日、)(.{1,40?})(?:で|にて).*?[0-9,，]+円/);
  const merchantMatch = text.match(/(?:に|で)(.{1,40})(?:で|にて).*?[0-9,，]+円/);
  const dateMatchJP = text.match(/(\d{1,2})月(\d{1,2})日/);
  const dateMatchSlash = text.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  const cardMatch = text.match(/(?:末尾|番号)[：:]\s*(\d{4})/);

  if (!amountMatch) return null;
  const amount = parseInt(amountMatch[1].replace(/[,，]/g, ""), 10);
  if (isNaN(amount) || amount <= 0) return null;

  let dateStr = toDateString(new Date());
  const now = new Date();
  if (dateMatchJP) {
    const m = parseInt(dateMatchJP[1], 10);
    const d = parseInt(dateMatchJP[2], 10);
    const year = now.getMonth() + 1 < m ? now.getFullYear() - 1 : now.getFullYear();
    dateStr = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  } else if (dateMatchSlash) {
    dateStr = `${dateMatchSlash[1]}-${dateMatchSlash[2]}-${dateMatchSlash[3]}`;
  }

  const merchantRaw = merchantMatch2?.[1] || merchantMatch?.[1] || merchantMatch?.[2] || "";
  const merchant = merchantRaw.trim() || "不明";
  const cardSuffix = cardMatch?.[1] || "";
  return { date: dateStr, merchant, amount, cardSuffix };
}

export default function TransactionsPage() {
  const { familyCode, viewYear, viewMonth, prevMonth, nextMonth, members } = useAppContext();
  const recurringAppliedKey = `mm_recurring_applied_${viewYear}_${String(viewMonth).padStart(2, "0")}`;

  // Real-time transactions from Supabase
  const transactions = useMonthTransactions(viewYear, viewMonth);

  // Recurring items from Supabase
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  useEffect(() => {
    if (familyCode) getRecurringItems(familyCode).then(setRecurringItems);
  }, [familyCode]);

  const [showRecurringBanner, setShowRecurringBanner] = useState(false);
  const [pendingRecurring, setPendingRecurring] = useState<RecurringItem[]>([]);

  useEffect(() => {
    if (recurringItems.length === 0) return;
    if (localStorage.getItem(recurringAppliedKey)) return;
    const today = new Date();
    const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1;
    if (!isCurrentMonth) return;
    const pending = recurringItems.filter((r) => {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(r.dayOfMonth).padStart(2, "0")}`;
      return today.getDate() >= r.dayOfMonth &&
        !transactions.some((t) => t.merchant === r.name && t.date === dateStr && t.source === "manual");
    });
    if (pending.length > 0) { setPendingRecurring(pending); setShowRecurringBanner(true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurringItems]);

  const applyRecurring = async () => {
    const newTxs: Transaction[] = pendingRecurring.map((r) => ({
      id: `recurring-${r.id}-${viewYear}-${viewMonth}`,
      date: `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(r.dayOfMonth).padStart(2, "0")}`,
      amount: r.amount, merchant: r.name, categoryId: r.categoryId, memberId: r.memberId, source: "manual" as TransactionSource,
    }));
    await upsertManyTransactions(familyCode, newTxs);
    localStorage.setItem(recurringAppliedKey, "1");
    setShowRecurringBanner(false); setPendingRecurring([]);
  };

  const dismissRecurring = () => {
    localStorage.setItem(recurringAppliedKey, "1");
    setShowRecurringBanner(false); setPendingRecurring([]);
  };

  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [conflictPair, setConflictPair] = useState<[Transaction, Transaction] | null>(null);
  const [selectedMember, setSelectedMember] = useState<string>("all");

  const [form, setForm] = useState({
    merchant: "", amount: "", categoryId: "food",
    memberId: members[0]?.id ?? "m1", date: toDateString(new Date()),
  });

  const [emailText, setEmailText] = useState("");
  const [parsedEmail, setParsedEmail] = useState<ReturnType<typeof parseRakutenEmail>>(null);
  const [emailMemberId, setEmailMemberId] = useState(members[0]?.id ?? "m1");
  const [emailCategoryId, setEmailCategoryId] = useState("other");

  const handleParseEmail = () => {
    const result = parseRakutenEmail(emailText);
    setParsedEmail(result);
    if (result?.cardSuffix) {
      const matched = members.find((m) => m.cardSuffix === result.cardSuffix);
      if (matched) setEmailMemberId(matched.id);
    }
  };

  const handleImportEmail = async () => {
    if (!parsedEmail) return;
    const newTx: Transaction = {
      id: `email-import-${Date.now()}`,
      date: parsedEmail.date, amount: parsedEmail.amount,
      merchant: parsedEmail.merchant, categoryId: emailCategoryId, memberId: emailMemberId, source: "email",
    };
    const matched = findMatch(newTx, transactions.filter((t) => t.source === "manual"));
    if (matched) {
      await upsertTransaction(familyCode, { ...matched, source: "confirmed" as TransactionSource });
    } else {
      await upsertTransaction(familyCode, newTx);
    }
    setEmailText(""); setParsedEmail(null); setShowEmailModal(false);
  };

  const filtered = useMemo(() => {
    const deduped = transactions.filter((t) => {
      if (t.source !== "conflict") return true;
      if (!t.matchedId) return true;
      return t.id < t.matchedId;
    });
    return selectedMember === "all" ? deduped : deduped.filter((t) => t.memberId === selectedMember);
  }, [transactions, selectedMember]);

  const grouped = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    for (const t of [...filtered].sort((a, b) => b.date.localeCompare(a.date))) {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    }
    return map;
  }, [filtered]);

  const handleCategoryChange = async (txId: string, newCategoryId: string) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;
    await upsertTransaction(familyCode, { ...tx, categoryId: newCategoryId });
    setEditTarget(null);
  };

  const handleDeleteTx = async (txId: string) => {
    await deleteTransaction(familyCode, txId);
    setEditTarget(null);
  };

  const handleAddManual = async () => {
    const amount = parseInt(form.amount.replace(/[^0-9]/g, ""), 10);
    if (!form.merchant || isNaN(amount)) return;
    const newTx: Transaction = {
      id: `manual-${Date.now()}`, date: form.date, amount,
      merchant: form.merchant, categoryId: form.categoryId, memberId: form.memberId, source: "manual",
    };
    const matched = findMatch(newTx, transactions.filter((t) => t.source === "email"));
    if (matched) {
      await upsertTransaction(familyCode, { ...matched, source: "confirmed" });
    } else {
      await upsertTransaction(familyCode, newTx);
    }
    setForm({ merchant: "", amount: "", categoryId: "food", memberId: members[0]?.id ?? "m1", date: toDateString(new Date()) });
    setShowAddModal(false);
  };

  const resolveConflict = async (keep: Transaction, discard: Transaction) => {
    await deleteTransaction(familyCode, discard.id);
    await upsertTransaction(familyCode, { ...keep, source: "confirmed" as TransactionSource, matchedId: undefined });
    setConflictPair(null);
  };

  const handleExportCSV = () => {
    const allDeduped = transactions.filter((t) => {
      if (t.source !== "conflict") return true;
      if (!t.matchedId) return true;
      return t.id < t.matchedId;
    });
    const header = "日付,店舗名,カテゴリ,メンバー,金額,入力元";
    const rows = allDeduped.sort((a, b) => a.date.localeCompare(b.date)).map((tx) => {
      const cat = getCategoryById(tx.categoryId);
      const member = getMemberById(tx.memberId, members);
      return `${tx.date},"${tx.merchant}","${cat.name}","${member.name}",${tx.amount},"${SOURCE_CONFIG[tx.source].label}"`;
    });
    const blob = new Blob(["\uFEFF" + [header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `明細_${viewYear}${String(viewMonth).padStart(2, "0")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const memberFilter = [{ id: "all", name: "全員", color: "#94a3b8" }, ...members];
  const conflictCount = transactions.filter((t) => t.source === "conflict" && (!t.matchedId || t.id < t.matchedId)).length;
  const totalSpent = useMemo(() => getTotalSpent(filtered), [filtered]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="glass-header px-4 pt-12 pb-0 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-800">明細</h1>
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft size={14} className="text-gray-400" />
            </button>
            <span className="text-xs text-gray-500 font-medium">{viewYear}年{viewMonth}月</span>
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight size={14} className="text-gray-400" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {conflictCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-500 px-2.5 py-1 rounded-full text-xs font-semibold">
                <AlertTriangle size={11} />要確認 {conflictCount}件
              </div>
            )}
            <button onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600">
              <Mail size={12} />メール
            </button>
            <button onClick={handleExportCSV}
              className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600">
              <Download size={12} />CSV
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2.5 scrollbar-none">
          {memberFilter.map((m) => (
            <button key={m.id} onClick={() => setSelectedMember(m.id)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors font-medium ${
                selectedMember === m.id ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}>{m.name}</button>
          ))}
        </div>
      </div>

      {showRecurringBanner && (
        <div className="mx-4 mt-3 rounded-2xl p-3" style={{ background: "rgba(224,242,254,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(186,230,253,0.55)" }}>
          <div className="flex items-start gap-2.5">
            <Repeat size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-700 mb-0.5">固定費を追加しますか？</p>
              <p className="text-xs text-blue-500 mb-2">
                {pendingRecurring.map((r) => `${r.name} (${formatAmount(r.amount)})`).join("、")}
              </p>
              <div className="flex gap-2">
                <button onClick={applyRecurring} className="flex-1 bg-blue-500 text-white text-xs font-bold py-1.5 rounded-lg">追加する</button>
                <button onClick={dismissRecurring} className="flex-1 bg-white text-gray-500 text-xs font-medium py-1.5 rounded-lg border border-gray-200">スキップ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl flex justify-between items-center text-sm font-bold text-indigo-700" style={{ background: "rgba(238,242,255,0.78)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", border: "1px solid rgba(199,210,254,0.55)" }}>
        <span>{viewYear}年{viewMonth}月の支出合計</span>
        <span>{formatAmount(totalSpent)}</span>
      </div>

      <div className="px-4 pt-2 pb-1 flex flex-wrap gap-1.5">
        {(Object.entries(SOURCE_CONFIG) as [TransactionSource, typeof SOURCE_CONFIG[TransactionSource]][]).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
            style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color + "30" }}>
            {cfg.icon}<span>{cfg.label}</span>
          </div>
        ))}
      </div>

      <div className="px-4 py-2">
        {Object.keys(grouped).length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center mt-4">
            <span className="text-3xl">📋</span>
            <p className="text-sm text-gray-400 mt-2">この月の支出はありません</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, txs]) => (
            <div key={date} className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-500">
                  {formatDate(date)} ({["日","月","火","水","木","金","土"][new Date(date).getDay()]})
                </p>
                <p className="text-xs text-red-500 font-semibold">{formatAmount(txs.reduce((s, t) => s + t.amount, 0))}</p>
              </div>
              <div className="glass rounded-2xl overflow-hidden">
                {txs.map((tx, i) => {
                  const cat = getCategoryById(tx.categoryId);
                  const member = getMemberById(tx.memberId, members);
                  const srcCfg = SOURCE_CONFIG[tx.source];
                  const isConflict = tx.source === "conflict";
                  return (
                    <div key={tx.id}
                      onClick={() => {
                        if (isConflict && tx.matchedId) {
                          const partner = transactions.find((t) => t.id === tx.matchedId);
                          if (partner) { setConflictPair([tx, partner]); return; }
                        }
                        setEditTarget(tx);
                      }}
                      role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
                      className={`flex items-center gap-3 p-3.5 cursor-pointer transition-colors ${
                        isConflict ? "bg-red-50 hover:bg-red-100" : "hover:bg-white/30"
                      } ${i !== txs.length - 1 ? "border-b border-white/50" : ""}`}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: cat.color + "18" }}>{cat.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{tx.merchant}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: cat.color + "18", color: cat.color }}>{cat.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                            style={{ backgroundColor: member.color }}>{member.name}</span>
                          <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium border"
                            style={{ backgroundColor: srcCfg.bg, color: srcCfg.color, borderColor: srcCfg.color + "30" }}>
                            {srcCfg.icon}{srcCfg.label}
                          </span>
                        </div>
                        {isConflict && tx.matchedId && (() => {
                          const partner = transactions.find((t) => t.id === tx.matchedId);
                          return partner ? (
                            <p className="text-xs text-red-500 mt-1">
                              手動 {formatAmount(tx.amount)} / メール {formatAmount(partner.amount)} → タップして解決
                            </p>
                          ) : null;
                        })()}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-sm font-bold text-red-500">{formatAmount(tx.amount)}</span>
                        <ChevronRight size={14} className="text-gray-300" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <button onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg shadow-blue-300/50 flex items-center justify-center hover:bg-blue-600 transition-colors z-40">
        <Plus size={24} />
      </button>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={() => setShowAddModal(false)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl overflow-hidden max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-bold text-gray-800">支出を手動入力</h2>
                <p className="text-xs text-gray-400 mt-0.5">メール到着後に自動照合します</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 px-4 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">日付</label>
                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">お店・サービス名</label>
                <input type="text" value={form.merchant} placeholder="例: スーパー、Amazon..."
                  onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">金額</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
                  <input type="number" value={form.amount} placeholder="0"
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">カテゴリ</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button key={cat.id} onClick={() => setForm((f) => ({ ...f, categoryId: cat.id }))}
                      className={`flex flex-col items-center p-2.5 rounded-xl border-2 transition-all ${
                        form.categoryId === cat.id ? "border-blue-400 bg-blue-50" : "border-transparent bg-gray-50"
                      }`}>
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-[10px] mt-0.5 leading-tight text-center text-gray-600">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">誰の支出？</label>
                <div className="flex gap-2 flex-wrap">
                  {members.map((m) => (
                    <button key={m.id} onClick={() => setForm((f) => ({ ...f, memberId: m.id }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all min-w-[60px] ${
                        form.memberId === m.id ? "border-transparent text-white" : "border-transparent bg-gray-100 text-gray-600"
                      }`}
                      style={form.memberId === m.id ? { backgroundColor: m.color } : {}}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-4 pb-6 pt-3 flex-shrink-0 border-t border-gray-100 bg-white">
              <button onClick={handleAddManual} className="w-full bg-blue-500 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-blue-600 transition-colors">
                支出を追加
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end"
          onClick={() => { setShowEmailModal(false); setEmailText(""); setParsedEmail(null); }}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-bold text-gray-800">メール速報を貼り付け</h2>
                <p className="text-xs text-gray-400 mt-0.5">楽天カードの決済通知メールを解析します</p>
              </div>
              <button onClick={() => { setShowEmailModal(false); setEmailText(""); setParsedEmail(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 px-4 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">メール本文をここに貼り付け</label>
                <textarea value={emailText}
                  onChange={(e) => { setEmailText(e.target.value); setParsedEmail(null); }}
                  rows={6}
                  placeholder={"例:\n【楽天カード】ご利用のお知らせ\n3月5日にAmazonで6,700円のご利用がありました。\nカード末尾番号：1234"}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 resize-none" />
              </div>
              <button onClick={handleParseEmail} disabled={!emailText.trim()}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <RefreshCw size={14} />解析する
              </button>
              {parsedEmail && (
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-green-700">✓ 解析成功</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-xs text-gray-400">日付</p><p className="font-semibold text-gray-800">{parsedEmail.date}</p></div>
                    <div><p className="text-xs text-gray-400">金額</p><p className="font-bold text-red-500">{formatAmount(parsedEmail.amount)}</p></div>
                    <div className="col-span-2"><p className="text-xs text-gray-400">店舗</p><p className="font-semibold text-gray-800">{parsedEmail.merchant}</p></div>
                    {parsedEmail.cardSuffix && (
                      <div className="col-span-2"><p className="text-xs text-gray-400">カード末尾</p><p className="font-semibold text-gray-800">{parsedEmail.cardSuffix}</p></div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">カテゴリ</p>
                    <div className="grid grid-cols-4 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button key={cat.id} onClick={() => setEmailCategoryId(cat.id)}
                          className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${
                            emailCategoryId === cat.id ? "border-blue-400 bg-blue-50" : "border-transparent bg-white"
                          }`}>
                          <span className="text-lg">{cat.icon}</span>
                          <span className="text-[9px] mt-0.5 text-center text-gray-600 leading-tight">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">メンバー</p>
                    <div className="flex gap-2 flex-wrap">
                      {members.map((m) => (
                        <button key={m.id} onClick={() => setEmailMemberId(m.id)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all min-w-[56px] ${
                            emailMemberId === m.id ? "border-transparent text-white" : "border-transparent bg-gray-100 text-gray-600"
                          }`}
                          style={emailMemberId === m.id ? { backgroundColor: m.color } : {}}>{m.name}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 pb-6 pt-3 flex-shrink-0 border-t border-gray-100 bg-white">
              <button onClick={handleImportEmail} disabled={!parsedEmail}
                className="w-full bg-blue-500 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                支出として取り込む
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={() => setEditTarget(null)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="font-bold text-gray-800">{editTarget.merchant}</p>
                <p className="text-sm text-red-500 font-semibold">{formatAmount(editTarget.amount)}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <p className="text-xs font-semibold text-gray-500 mb-2.5">カテゴリを変更</p>
            <div className="grid grid-cols-4 gap-2 pb-4">
              {CATEGORIES.map((cat) => (
                <button key={cat.id} onClick={() => handleCategoryChange(editTarget.id, cat.id)}
                  className={`flex flex-col items-center p-2.5 rounded-xl border-2 transition-all ${
                    editTarget.categoryId === cat.id ? "border-blue-400 bg-blue-50" : "border-transparent bg-gray-50"
                  }`}>
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-[10px] mt-0.5 text-center leading-tight text-gray-600">{cat.name}</span>
                  {editTarget.categoryId === cat.id && <Check size={11} className="text-blue-500 mt-0.5" />}
                </button>
              ))}
            </div>
            <button onClick={() => handleDeleteTx(editTarget.id)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">
              この支出を削除
            </button>
          </div>
        </div>
      )}

      {conflictPair && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={() => setConflictPair(null)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                金額不一致：どちらが正しいですか？
              </h2>
              <button onClick={() => setConflictPair(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">{conflictPair[0].merchant} / {formatDate(conflictPair[0].date)}</p>
            <div className="space-y-2.5 pb-4">
              {[
                { tx: conflictPair[0], label: "✏️ 手動入力", other: conflictPair[1] },
                { tx: conflictPair[1], label: "📧 メール速報", other: conflictPair[0] },
              ].map(({ tx, label, other }) => (
                <button key={tx.id} onClick={() => resolveConflict(tx, other)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-blue-400 hover:bg-blue-50 transition-all">
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-0.5">{formatAmount(tx.amount)}</p>
                  </div>
                  <span className="text-sm text-blue-500 font-semibold">採用 →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
