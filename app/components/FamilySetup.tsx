"use client";
import { useState } from "react";
import { FAMILY_CODE_KEY } from "../lib/supabase";

type Props = {
  onCodeSet: (code: string) => void;
};

export default function FamilySetup({ onCodeSet }: Props) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const code = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length < 4 || code.length > 12) {
      setError("4〜12文字の英数字で入力してください（例: TANAKA、FIRE42）");
      return;
    }
    localStorage.setItem(FAMILY_CODE_KEY, code);
    onCodeSet(code);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-6 z-50"
      style={{
        background: "linear-gradient(135deg, #ede9fe 0%, #f5f3ff 50%, #eef2ff 100%)",
      }}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl shadow-indigo-100">
        {/* Icon + heading */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4 C16 4 10 10 10 18 C10 22 13 25 16 26 C19 25 22 22 22 18 C22 10 16 4 16 4Z" fill="white" opacity="0.9"/>
              <path d="M16 26 L16 30" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="16" cy="18" r="3" fill="white" opacity="0.7"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Road to FIRE</h1>
          <p className="text-sm text-gray-400 mt-1">家族コードを入力してください</p>
        </div>

        {/* Explanation */}
        <div className="rounded-2xl p-4 mb-6 text-xs leading-relaxed"
          style={{ background: "#f5f3ff", color: "#4f46e5" }}>
          <p className="font-semibold mb-1">家族コードとは？</p>
          <p>家族全員が同じコードを入力すると、<br/>リアルタイムでデータを共有できます。</p>
          <p className="mt-1 opacity-70">例: <strong>TANAKA</strong>、<strong>FIRE42</strong></p>
        </div>

        {/* Input */}
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value.toUpperCase()); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="例: TANAKA"
          maxLength={12}
          autoFocus
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold text-center tracking-widest focus:outline-none bg-gray-50 mb-2"
          style={{ caretColor: "#4f46e5" }}
          onFocus={(e) => (e.target.style.borderColor = "#4f46e5")}
          onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
        />
        {error && <p className="text-xs text-red-500 text-center mb-2">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="w-full text-white py-3.5 rounded-2xl font-bold text-sm transition-opacity disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
        >
          このコードで始める
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          コードは設定画面からいつでも変更できます
        </p>
      </div>
    </div>
  );
}
