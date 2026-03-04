"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Calendar, BarChart2, Settings } from "lucide-react";

const NAV = [
  { href: "/",             label: "ホーム",     Icon: Home },
  { href: "/transactions", label: "明細",       Icon: List },
  { href: "/calendar",     label: "カレンダー", Icon: Calendar },
  { href: "/reports",      label: "レポート",   Icon: BarChart2 },
  { href: "/settings",     label: "設定",       Icon: Settings },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        style={{
          background: "rgba(248,247,253,0.92)",
          backdropFilter: "blur(32px) saturate(200%)",
          WebkitBackdropFilter: "blur(32px) saturate(200%)",
          borderTop: "1px solid rgba(255,255,255,0.72)",
          boxShadow: "0 -1px 0 rgba(79,70,229,0.07), 0 -8px 28px rgba(79,70,229,0.07)",
        }}
      >
        <div className="max-w-md mx-auto flex">
          {NAV.map(({ href, label, Icon }) => {
            const active = path === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center pt-2 pb-3 gap-0.5 transition-all"
              >
                <div
                  className={`flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200 ${
                    active ? "bg-indigo-100" : ""
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    className={`transition-colors duration-200 ${
                      active ? "text-indigo-600" : "text-gray-400"
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold transition-colors duration-200 ${
                    active ? "text-indigo-600" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
