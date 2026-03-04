"use client";
import { useState, useRef, useEffect } from "react";
import {
  Check, Bell, CreditCard, Users, ChevronRight, ChevronDown,
  Calendar, Plus, X, Trash2, Download, Upload, RotateCcw,
  Repeat, AlertCircle, Edit2, Save,
} from "lucide-react";
import { CATEGORIES, Member, RecurringItem } from "../lib/mockData";
import { formatAmount, WEEKEND_WEIGHT_OPTIONS } from "../lib/utils";
import { useAppContext } from "../context/AppContext";
import { FAMILY_CODE_KEY } from "../lib/supabase";
import {
  getRecurringItems,
  upsertRecurringItem,
  deleteRecurringItem as dbDeleteRecurringItem,
} from "../lib/db";

const COLOR_PALETTE = [
  "#818cf8", "#a78bfa", "#c084fc", "#e879f9",
  "#f472b6", "#fb7185", "#f87171", "#fb923c",
  "#fbbf24", "#a3e635", "#34d399", "#22d3ee",
  "#60a5fa", "#94a3b8", "#6b7280", "#78716c",
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${on ? "bg-blue-500" : "bg-gray-200"}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-transform ${on ? "translate-x-5 bg-white" : "translate-x-0.5 bg-white"}`} />
    </button>
  );
}

function SectionHeader({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3.5 border-b border-white/50">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <h2 className="font-bold text-sm text-gray-800">{label}</h2>
    </div>
  );
}

export default function SettingsPage() {
  const {
    familyCode,
    monthlyBudget, setMonthlyBudget,
    weekendWeight, setWeekendWeight,
    members, setMembers,
    viewYear, viewMonth,
    setMonthBudget, getMonthBudget,
    alerts, setAlerts,
    salaryDay, setSalaryDay,
  } = useAppContext();

  const [inputBudget, setInputBudget] = useState(String(monthlyBudget));
  const [budgetSaved, setBudgetSaved] = useState(false);
  const currentMonthBudget = getMonthBudget(viewYear, viewMonth);
  const [inputMonthBudget, setInputMonthBudget] = useState(String(currentMonthBudget));
  const [monthBudgetSaved, setMonthBudgetSaved] = useState(false);

  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const selectedWeightLabel = WEEKEND_WEIGHT_OPTIONS.find((o) => o.value === weekendWeight)?.label ?? "";

  // メンバー管理
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberFormName, setMemberFormName] = useState("");
  const [memberFormCard, setMemberFormCard] = useState("");
  const [memberFormColor, setMemberFormColor] = useState(COLOR_PALETTE[0]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const openAddMember = () => {
    setIsAddingMember(true); setEditingMember(null);
    setMemberFormName(""); setMemberFormCard("");
    setMemberFormColor(COLOR_PALETTE[members.length % COLOR_PALETTE.length]);
    setShowMemberModal(true);
  };
  const openEditMember = (m: Member) => {
    setIsAddingMember(false); setEditingMember(m);
    setMemberFormName(m.name); setMemberFormCard(m.cardSuffix); setMemberFormColor(m.color);
    setShowMemberModal(true);
  };
  const saveMember = () => {
    const name = memberFormName.trim();
    if (!name) return;
    if (isAddingMember) {
      setMembers([...members, { id: `m-${Date.now()}`, name, cardSuffix: memberFormCard.trim().slice(-4), color: memberFormColor }]);
    } else if (editingMember) {
      setMembers(members.map((m) => m.id === editingMember.id ? { ...m, name, cardSuffix: memberFormCard.trim().slice(-4), color: memberFormColor } : m));
    }
    setShowMemberModal(false);
  };
  const deleteMember = (id: string) => {
    if (members.length <= 1) return;
    setMembers(members.filter((m) => m.id !== id));
    setShowMemberModal(false);
  };

  // 繰り返し支出 (Supabase)
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  useEffect(() => {
    if (familyCode) getRecurringItems(familyCode).then(setRecurringItems);
  }, [familyCode]);

  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringItem | null>(null);
  const [isAddingRecurring, setIsAddingRecurring] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    name: "", amount: "", categoryId: "daily", memberId: members[0]?.id ?? "m1", dayOfMonth: 1,
  });

  const openAddRecurring = () => {
    setIsAddingRecurring(true); setEditingRecurring(null);
    setRecurringForm({ name: "", amount: "", categoryId: "daily", memberId: members[0]?.id ?? "m1", dayOfMonth: 1 });
    setShowRecurringModal(true);
  };
  const openEditRecurring = (r: RecurringItem) => {
    setIsAddingRecurring(false); setEditingRecurring(r);
    setRecurringForm({ name: r.name, amount: String(r.amount), categoryId: r.categoryId, memberId: r.memberId, dayOfMonth: r.dayOfMonth });
    setShowRecurringModal(true);
  };
  const saveRecurringItem = async () => {
    const name = recurringForm.name.trim();
    const amount = parseInt(recurringForm.amount.replace(/[^0-9]/g, ""), 10);
    if (!name || isNaN(amount) || amount <= 0) return;
    const item: RecurringItem = isAddingRecurring
      ? { id: `r-${Date.now()}`, name, amount, categoryId: recurringForm.categoryId, memberId: recurringForm.memberId, dayOfMonth: recurringForm.dayOfMonth }
      : { ...editingRecurring!, name, amount, categoryId: recurringForm.categoryId, memberId: recurringForm.memberId, dayOfMonth: recurringForm.dayOfMonth };
    await upsertRecurringItem(familyCode, item);
    setRecurringItems((prev) =>
      isAddingRecurring ? [...prev, item] : prev.map((r) => r.id === item.id ? item : r)
    );
    setShowRecurringModal(false);
  };
  const handleDeleteRecurring = async (id: string) => {
    await dbDeleteRecurringItem(familyCode, id);
    setRecurringItems((prev) => prev.filter((r) => r.id !== id));
    setShowRecurringModal(false);
  };

  // データ管理
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<"success" | "error" | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string) as Record<string, unknown>;
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith("mm_")) localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
        }
        setImportResult("success");
        setTimeout(() => { setImportResult(null); window.location.reload(); }, 1500);
      } catch { setImportResult("error"); setTimeout(() => setImportResult(null), 3000); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleReset = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("mm_")) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    setShowResetConfirm(false); window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="glass-header px-4 pt-12 pb-4">
        <h1 className="text-base font-bold text-gray-800">設定</h1>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* 予算設定 */}
        <div className="glass rounded-2xl overflow-hidden">
          <SectionHeader icon={<CreditCard size={15} />} label="予算設定" color="#3b82f6" />
          <div className="p-4 border-b border-white/50">
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">月間デフォルト予算</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">¥</span>
                <input type="number" value={inputBudget} onChange={(e) => setInputBudget(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </div>
              <button onClick={() => { const v = parseInt(inputBudget.replace(/[^0-9]/g, ""), 10); if (!isNaN(v) && v > 0) { setMonthlyBudget(v); setBudgetSaved(true); setTimeout(() => setBudgetSaved(false), 2000); } }}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5 ${budgetSaved ? "bg-emerald-500 text-white" : "bg-blue-500 text-white hover:bg-blue-600"}`}>
                {budgetSaved ? <><Check size={15} />保存済</> : "保存"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">全ての月に適用されます</p>
          </div>
          <div className="p-4 border-b border-white/50">
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{viewYear}年{viewMonth}月の予算（個別設定）</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">¥</span>
                <input type="number" value={inputMonthBudget} onChange={(e) => setInputMonthBudget(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </div>
              <button onClick={() => { const v = parseInt(inputMonthBudget.replace(/[^0-9]/g, ""), 10); if (!isNaN(v) && v > 0) { setMonthBudget(viewYear, viewMonth, v); setMonthBudgetSaved(true); setTimeout(() => setMonthBudgetSaved(false), 2000); } }}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5 ${monthBudgetSaved ? "bg-emerald-500 text-white" : "bg-blue-500 text-white hover:bg-blue-600"}`}>
                {monthBudgetSaved ? <><Check size={15} />保存済</> : "保存"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">この月だけ別の予算にしたいときに設定</p>
          </div>
          <div className="px-4 pb-4">
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">給料日（集計開始日）</label>
            <select value={salaryDay} onChange={(e) => setSalaryDay(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>毎月 {d}日</option>)}
            </select>
          </div>
        </div>

        {/* 繰り返し支出 */}
        <div className="glass rounded-2xl overflow-hidden">
          <SectionHeader icon={<Repeat size={15} />} label="繰り返し支出（固定費）" color="#8b5cf6" />
          {recurringItems.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-400">固定費が登録されていません</p>
              <p className="text-xs text-gray-300 mt-0.5">毎月発生するサブスクや家賃を登録しましょう</p>
            </div>
          ) : (
            recurringItems.map((r, i) => {
              const cat = CATEGORIES.find((c) => c.id === r.categoryId) || CATEGORIES[CATEGORIES.length - 1];
              const member = members.find((m) => m.id === r.memberId) || members[0];
              return (
                <div key={r.id} onClick={() => openEditRecurring(r)}
                  className={`flex items-center gap-3 p-3.5 cursor-pointer hover:bg-white/30 transition-colors ${i !== recurringItems.length - 1 ? "border-b border-white/50" : ""}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: cat.color + "18" }}>{cat.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{r.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-400">毎月{r.dayOfMonth}日</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: member.color }}>{member.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-gray-700">{formatAmount(r.amount)}</span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
              );
            })
          )}
          <div className="p-3.5 border-t border-white/50">
            <button onClick={openAddRecurring}
              className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors font-medium flex items-center justify-center gap-1.5">
              <Plus size={14} />固定費を追加
            </button>
          </div>
        </div>

        {/* 土日ウェイト */}
        <div className="glass rounded-2xl overflow-hidden">
          <SectionHeader icon={<Calendar size={15} />} label="土日の予算ウェイト" color="#3b82f6" />
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">土日の1日あたりの予算を平日の何倍にするか設定します。</p>
            <button onClick={() => setShowWeightPicker(!showWeightPicker)}
              className="w-full flex items-center justify-between px-4 py-3 bg-blue-500 rounded-xl">
              <div className="flex items-center gap-2"><span className="text-lg">🏖️</span><span className="text-sm font-bold text-white">{selectedWeightLabel}</span></div>
              <ChevronDown size={15} className={`text-white/70 transition-transform ${showWeightPicker ? "rotate-180" : ""}`} />
            </button>
            {showWeightPicker && (
              <div className="mt-2 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.7)" }}>
                {WEEKEND_WEIGHT_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => { setWeekendWeight(opt.value); setShowWeightPicker(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm border-b border-white/50 last:border-0 transition-colors ${
                      weekendWeight === opt.value ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-700 hover:bg-gray-50"
                    }`}>
                    <span>{opt.label}</span>
                    {weekendWeight === opt.value && <span className="text-[10px] bg-blue-100 text-blue-500 px-2 py-0.5 rounded-full font-semibold">選択中</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* アラート */}
        <div className="glass rounded-2xl overflow-hidden">
          <SectionHeader icon={<Bell size={15} />} label="アラート設定" color="#f59e0b" />
          {[
            { key: "p70" as const, label: "予算の70%を超えたら通知", desc: "残り予算が少なくなる前に気づける" },
            { key: "p90" as const, label: "予算の90%を超えたら通知", desc: "危険水域に達したとき" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 border-b border-white/50 last:border-0">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <Toggle on={alerts[key]} onChange={() => setAlerts({ ...alerts, [key]: !alerts[key] })} />
            </div>
          ))}
        </div>

        {/* メンバー管理 */}
        <div className="glass rounded-2xl overflow-hidden">
          <SectionHeader icon={<Users size={15} />} label="メンバー管理" color="#ec4899" />
          {members.map((m, i) => (
            <div key={m.id} onClick={() => openEditMember(m)}
              className={`flex items-center gap-3 p-3.5 cursor-pointer hover:bg-white/30 transition-colors ${i !== members.length - 1 ? "border-b border-white/50" : ""}`}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm" style={{ backgroundColor: m.color }}>{m.name[0]}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{m.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">カード末尾: {m.cardSuffix || "未設定"}</p>
              </div>
              <div className="flex items-center gap-1">
                <Edit2 size={13} className="text-gray-300" /><ChevronRight size={14} className="text-gray-300" />
              </div>
            </div>
          ))}
          <div className="p-3.5 border-t border-white/50">
            <button onClick={openAddMember}
              className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors font-medium flex items-center justify-center gap-1.5">
              <Plus size={14} />メンバーを追加
            </button>
          </div>
        </div>

        {/* データ管理 */}
        <div className="glass rounded-2xl overflow-hidden mb-2">
          <SectionHeader icon={<Download size={15} />} label="データ管理" color="#10b981" />
          <div className="p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-0.5">バックアップ</p>
              <p className="text-xs text-gray-400 mb-2">設定データをJSONファイルに書き出します</p>
              <button onClick={() => {
                const data: Record<string, unknown> = { _exportedAt: new Date().toISOString(), _familyCode: familyCode };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `mm_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
                URL.revokeObjectURL(url);
              }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                <Download size={14} />バックアップをダウンロード
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-0.5">復元</p>
              <p className="text-xs text-gray-400 mb-2">バックアップJSONを読み込みます</p>
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                <Upload size={14} />バックアップから復元
              </button>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              {importResult === "success" && <p className="text-xs text-emerald-600 text-center mt-1.5 font-medium">✓ 復元しました。リロードします...</p>}
              {importResult === "error" && <p className="text-xs text-red-500 text-center mt-1.5 font-medium">✗ ファイルの読み込みに失敗しました</p>}
            </div>
            <div className="pt-1">
              <p className="text-sm font-semibold text-gray-700 mb-0.5">家族コードの変更</p>
              <p className="text-xs text-gray-400 mb-2">現在: <strong>{familyCode}</strong></p>
              <button onClick={() => { localStorage.removeItem(FAMILY_CODE_KEY); window.location.reload(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-50 border border-purple-100 rounded-xl text-sm font-semibold text-purple-700 hover:bg-purple-100 transition-colors">
                家族コードを変更する
              </button>
            </div>
            <div className="pt-1">
              <p className="text-sm font-semibold text-gray-700 mb-0.5">データリセット</p>
              <p className="text-xs text-gray-400 mb-2">全データを削除して初期状態に戻します</p>
              {!showResetConfirm ? (
                <button onClick={() => setShowResetConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors">
                  <RotateCcw size={14} />全データをリセット
                </button>
              ) : (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-red-600">本当にリセットしますか？元に戻せません。</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleReset} className="flex-1 py-2 bg-red-500 text-white text-xs font-bold rounded-lg">リセットする</button>
                    <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2 bg-white text-gray-500 text-xs font-medium rounded-lg border border-gray-200">キャンセル</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* メンバーモーダル */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={() => setShowMemberModal(false)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl overflow-hidden max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-bold text-gray-800">{isAddingMember ? "メンバーを追加" : "メンバーを編集"}</h2>
              <button onClick={() => setShowMemberModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"><X size={16} className="text-gray-500" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow"
                  style={{ backgroundColor: memberFormColor }}>{memberFormName[0] || "?"}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">名前</label>
                <input type="text" value={memberFormName} onChange={(e) => setMemberFormName(e.target.value)} placeholder="例: パパ、ママ"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">カード末尾4桁（任意）</label>
                <input type="text" value={memberFormCard} onChange={(e) => setMemberFormCard(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                  placeholder="例: 1234" maxLength={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">カラー</label>
                <div className="grid grid-cols-8 gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button key={c} onClick={() => setMemberFormColor(c)}
                      className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${memberFormColor === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
                      style={{ backgroundColor: c }}>
                      {memberFormColor === c && <Check size={12} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-4 pb-6 pt-3 flex-shrink-0 border-t border-gray-100 bg-white space-y-2">
              <button onClick={saveMember} disabled={!memberFormName.trim()}
                className="w-full bg-blue-500 text-white py-3 rounded-2xl font-bold text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                <Save size={15} />{isAddingMember ? "追加する" : "変更を保存"}
              </button>
              {!isAddingMember && editingMember && (
                <button onClick={() => deleteMember(editingMember.id)} disabled={members.length <= 1}
                  className="w-full py-2.5 rounded-2xl text-sm font-semibold text-red-500 bg-red-50 border border-red-100 disabled:opacity-40 flex items-center justify-center gap-2">
                  <Trash2 size={14} />削除する
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 繰り返しモーダル */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={() => setShowRecurringModal(false)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl overflow-hidden max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-bold text-gray-800">{isAddingRecurring ? "固定費を追加" : "固定費を編集"}</h2>
              <button onClick={() => setShowRecurringModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"><X size={16} className="text-gray-500" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">名称</label>
                <input type="text" value={recurringForm.name} onChange={(e) => setRecurringForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例: Netflix, Spotify, 家賃"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">金額</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
                  <input type="number" value={recurringForm.amount} onChange={(e) => setRecurringForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0" className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">毎月何日に発生しますか？</label>
                <select value={recurringForm.dayOfMonth} onChange={(e) => setRecurringForm((f) => ({ ...f, dayOfMonth: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>毎月 {d}日</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">カテゴリ</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button key={cat.id} onClick={() => setRecurringForm((f) => ({ ...f, categoryId: cat.id }))}
                      className={`flex flex-col items-center p-2.5 rounded-xl border-2 transition-all ${recurringForm.categoryId === cat.id ? "border-blue-400 bg-blue-50" : "border-transparent bg-gray-50"}`}>
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
                    <button key={m.id} onClick={() => setRecurringForm((f) => ({ ...f, memberId: m.id }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all min-w-[60px] ${recurringForm.memberId === m.id ? "border-transparent text-white" : "border-transparent bg-gray-100 text-gray-600"}`}
                      style={recurringForm.memberId === m.id ? { backgroundColor: m.color } : {}}>{m.name}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-4 pb-6 pt-3 flex-shrink-0 border-t border-gray-100 bg-white space-y-2">
              <button onClick={saveRecurringItem} disabled={!recurringForm.name.trim() || !recurringForm.amount}
                className="w-full bg-blue-500 text-white py-3 rounded-2xl font-bold text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors">
                {isAddingRecurring ? "追加する" : "変更を保存"}
              </button>
              {!isAddingRecurring && editingRecurring && (
                <button onClick={() => handleDeleteRecurring(editingRecurring.id)}
                  className="w-full py-2.5 rounded-2xl text-sm font-semibold text-red-500 bg-red-50 border border-red-100 flex items-center justify-center gap-2">
                  <Trash2 size={14} />削除する
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
