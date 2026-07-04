"use client";

import { useEffect, useState } from "react";

export function KeyboardHints() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "/") {
        e.preventDefault();
        setVisible((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (!visible) return null;

  return (
    <div className="hidden md:block fixed bottom-4 right-4 z-50 bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3 text-xs space-y-1">
      <div className="font-semibold mb-1">⌨️ Shortcuts</div>
      <div>
        <kbd className="px-1 py-0.5 bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">Ctrl+K</kbd> Command
        Palette
      </div>
      <div>
        <kbd className="px-1 py-0.5 bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">Ctrl+/</kbd> Toggle hints
      </div>
    </div>
  );
}
