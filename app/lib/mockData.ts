export type Member = {
  id: string;
  name: string;
  cardSuffix: string;
  color: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type TransactionSource = "manual" | "email" | "confirmed" | "conflict";

export type Transaction = {
  id: string;
  date: string;
  amount: number;
  merchant: string;
  categoryId: string;
  memberId: string;
  memo?: string;
  source: TransactionSource;
  matchedId?: string;
};

export type RecurringItem = {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  memberId: string;
  dayOfMonth: number; // 1–28
};

export const MEMBERS: Member[] = [
  { id: "m1", name: "パパ",   cardSuffix: "1234", color: "#818cf8" },
  { id: "m2", name: "ママ",   cardSuffix: "5678", color: "#f472b6" },
  { id: "m3", name: "タロウ", cardSuffix: "9012", color: "#fb923c" },
];

export const CATEGORIES: Category[] = [
  { id: "food",          name: "食費",         icon: "🛒", color: "#10b981" },
  { id: "dining",        name: "外食",         icon: "🍜", color: "#f59e0b" },
  { id: "transport",     name: "交通費",       icon: "🚃", color: "#6366f1" },
  { id: "entertainment", name: "娯楽",         icon: "🎮", color: "#ec4899" },
  { id: "fashion",       name: "ファッション", icon: "👕", color: "#8b5cf6" },
  { id: "health",        name: "医療・健康",   icon: "💊", color: "#ef4444" },
  { id: "daily",         name: "日用品",       icon: "🧴", color: "#14b8a6" },
  { id: "other",         name: "その他",       icon: "📦", color: "#94a3b8" },
];

export const TRANSACTIONS: Transaction[] = [
  { id: "t1",  date: "2026-03-01", amount: 3200, merchant: "イオン",             categoryId: "food",          memberId: "m2", source: "email" },
  { id: "t2",  date: "2026-03-01", amount: 1500, merchant: "マクドナルド",       categoryId: "dining",        memberId: "m1", source: "email" },
  { id: "t3",  date: "2026-03-02", amount: 2100, merchant: "Suica チャージ",     categoryId: "transport",     memberId: "m1", source: "email" },
  { id: "t4",  date: "2026-03-02", amount: 4800, merchant: "ユニクロ",           categoryId: "fashion",       memberId: "m2", source: "confirmed" },
  { id: "t5",  date: "2026-03-03", amount: 890,  merchant: "セブンイレブン",     categoryId: "food",          memberId: "m3", source: "manual" },
  { id: "t6",  date: "2026-03-03", amount: 5500, merchant: "スシロー",           categoryId: "dining",        memberId: "m1", source: "email" },
  { id: "t7",  date: "2026-03-04", amount: 1200, merchant: "ドラッグストア",     categoryId: "health",        memberId: "m2", source: "email" },
  { id: "t8",  date: "2026-03-05", amount: 6700, merchant: "Amazon",             categoryId: "daily",         memberId: "m1", source: "email" },
  { id: "t9",  date: "2026-03-06", amount: 3400, merchant: "西松屋",             categoryId: "daily",         memberId: "m2", source: "email" },
  { id: "t10", date: "2026-03-07", amount: 980,  merchant: "Spotify",            categoryId: "entertainment", memberId: "m1", source: "email" },
  { id: "t11", date: "2026-03-08", amount: 2200, merchant: "スターバックス",     categoryId: "dining",        memberId: "m2", source: "email" },
  { id: "t12", date: "2026-03-08", amount: 4100, merchant: "ヨドバシカメラ",     categoryId: "entertainment", memberId: "m1", source: "email" },
  { id: "t13", date: "2026-03-09", amount: 1800, merchant: "ローソン",           categoryId: "food",          memberId: "m3", source: "email" },
  { id: "t14", date: "2026-03-10", amount: 7200, merchant: "イオン",             categoryId: "food",          memberId: "m2", source: "email" },
  { id: "t15", date: "2026-03-11", amount: 3300, merchant: "牛角",               categoryId: "dining",        memberId: "m1", source: "email" },
  { id: "t16", date: "2026-03-12", amount: 1600, merchant: "薬局",               categoryId: "health",        memberId: "m2", source: "email" },
  { id: "t17", date: "2026-03-13", amount: 2400, merchant: "GU",                 categoryId: "fashion",       memberId: "m3", source: "email" },
  { id: "t18", date: "2026-03-14", amount: 5900, merchant: "楽天市場",           categoryId: "daily",         memberId: "m1", source: "email" },
  { id: "t19", date: "2026-03-15", amount: 3100, merchant: "サイゼリヤ",         categoryId: "dining",        memberId: "m2", source: "email" },
  { id: "t20", date: "2026-03-16", amount: 2800, merchant: "コストコ",           categoryId: "food",          memberId: "m1", source: "email" },
  { id: "t21", date: "2026-03-17", amount: 1400, merchant: "ファミリーマート",   categoryId: "food",          memberId: "m3", source: "email" },
  { id: "t22", date: "2026-03-18", amount: 6200, merchant: "映画館",             categoryId: "entertainment", memberId: "m1", source: "email" },
  { id: "t23", date: "2026-03-19", amount: 4400, merchant: "スーパー",           categoryId: "food",          memberId: "m2", source: "email" },
  { id: "t24", date: "2026-03-20", amount: 3700, merchant: "居酒屋",             categoryId: "dining",        memberId: "m1", source: "email" },
  { id: "t25", date: "2026-03-21", amount: 2000, merchant: "100均",              categoryId: "daily",         memberId: "m2", source: "email" },
  { id: "t26", date: "2026-03-22", amount: 5100, merchant: "ニトリ",             categoryId: "daily",         memberId: "m2", source: "email" },
  { id: "t27", date: "2026-03-23", amount: 1900, merchant: "マツキヨ",           categoryId: "health",        memberId: "m1", source: "email" },
  { id: "t28", date: "2026-03-24", amount: 3600, merchant: "焼肉店",             categoryId: "dining",        memberId: "m1", source: "email" },
  { id: "t29", date: "2026-03-25", amount: 2700, merchant: "イオン",             categoryId: "food",          memberId: "m2", source: "email" },
  { id: "t30", date: "2026-03-26", amount: 8800, merchant: "ショッピングモール", categoryId: "fashion",       memberId: "m2", source: "email" },
  { id: "t31", date: "2026-03-27", amount: 1100, merchant: "セブンイレブン",     categoryId: "food",          memberId: "m3", source: "email" },
  { id: "t32", date: "2026-03-28", amount: 4300, merchant: "ガスト",             categoryId: "dining",        memberId: "m1", source: "email" },
  { id: "t33", date: "2026-03-29", amount: 2500, merchant: "業務スーパー",       categoryId: "food",          memberId: "m2", source: "email" },
  { id: "t34", date: "2026-03-30", amount: 3900, merchant: "LEGO",               categoryId: "entertainment", memberId: "m3", source: "email" },
  { id: "t35",  date: "2026-03-31", amount: 6000, merchant: "Amazon", categoryId: "other", memberId: "m1", source: "conflict", matchedId: "t35e" },
  { id: "t35e", date: "2026-03-31", amount: 6500, merchant: "Amazon", categoryId: "other", memberId: "m1", source: "conflict", matchedId: "t35" },
];

export const MONTHLY_BUDGET = 150000;

export const PAST_MONTHS = [
  { month: "2025-09", total: 138000 },
  { month: "2025-10", total: 142000 },
  { month: "2025-11", total: 155000 },
  { month: "2025-12", total: 187000 },
  { month: "2026-01", total: 131000 },
  { month: "2026-02", total: 128000 },
];
