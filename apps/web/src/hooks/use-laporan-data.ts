"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLaporanFilter } from "./use-laporan-filter";

export function useLaporanData<T>(jenis: string, apiUrl: string) {
  const { bulan, tahun } = useLaporanFilter();
  const queryClient = useQueryClient();

  const dataQuery = useQuery<T[]>({
    queryKey: ["laporan", jenis, bulan, tahun],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}?bulan=${bulan}&tahun=${tahun}`);
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, bulan, tahun }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      toast.success("Data berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["laporan", jenis] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Gagal menyimpan data");
    },
  });

  return { data: dataQuery.data || [], isLoading: dataQuery.isLoading, bulan, tahun, submitMutation };
}

export function useMasterList(apiUrl: string) {
  return useQuery<any[]>({
    queryKey: ["master", apiUrl],
    queryFn: async () => {
      const res = await fetch(apiUrl);
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
