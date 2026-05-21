"use client";

import { useSession } from "next-auth/react";
import { useMasterList } from "./use-laporan-data";

export function usePuskesmasList() {
  const { data: session } = useSession();
  const { data: all = [], ...rest } = useMasterList("/api/master/puskesmas");
  const user = session?.user as any;
  const filtered = user?.role === "OPERATOR" && user?.puskesmasId ? all.filter((p: any) => p.id === user.puskesmasId) : all;
  return { data: filtered, ...rest };
}
