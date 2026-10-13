"use client";

import { useEffect, useState } from "react";

const LS_KEY = "kesling:sidebar-collapsed";

export function SidebarOffset({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(LS_KEY) === "1");
    const onToggle = () => setCollapsed(localStorage.getItem(LS_KEY) === "1");
    document.addEventListener("kesling:toggle-sidebar", onToggle);
    return () => document.removeEventListener("kesling:toggle-sidebar", onToggle);
  }, []);

  return <div className={`transition-[margin] duration-200 ${collapsed ? "ml-16" : "ml-[232px]"}`}>{children}</div>;
}
