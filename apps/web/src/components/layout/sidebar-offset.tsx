"use client";

import { useEffect, useState } from "react";

const LS_KEY = "kesling:sidebar-collapsed";

export function SidebarOffset({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(LS_KEY) === "1");
    setMounted(true);
    const onToggle = (e: any) => {
      if (e?.detail && typeof e.detail.collapsed === "boolean") {
        setCollapsed(e.detail.collapsed);
      } else {
        setCollapsed(localStorage.getItem(LS_KEY) === "1");
      }
    };
    document.addEventListener("kesling:toggle-sidebar", onToggle);
    return () => document.removeEventListener("kesling:toggle-sidebar", onToggle);
  }, []);

  return (
    <div
      className={`ml-0 ${
        mounted ? "transition-[margin] duration-200" : ""
      } ${collapsed ? "md:ml-16" : "md:ml-[232px]"}`}
    >
      {children}
    </div>
  );
}
