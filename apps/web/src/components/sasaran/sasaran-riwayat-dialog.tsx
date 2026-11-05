"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Calendar, ExternalLink, FileCheck, FlaskConical, History, Plus, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SasaranRiwayatDialogProps {
  sasaran: any | null;
  categoryCode?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SasaranRiwayatDialog({
  sasaran,
  categoryCode: _categoryCode,
  open,
  onOpenChange,
}: SasaranRiwayatDialogProps) {
  const sasaranId = sasaran?.id;
  const sasaranNama = sasaran?.nama || "Sasaran";

  const { data: riwayatData = [], isLoading } = useQuery<any[]>({
    queryKey: ["inspection-results-sasaran", sasaranId],
    queryFn: async () => {
      if (!sasaranId) return [];
      const res = await fetch(`/api/inspection/results?sasaranId=${sasaranId}&limit=100`);
      if (!res.ok) throw new Error("Gagal mengambil riwayat pemeriksaan");
      const json = await res.json();
      return Array.isArray(json) ? json : json.data || [];
    },
    enabled: open && !!sasaranId,
    staleTime: 15_000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-black text-foreground truncate">
                Riwayat Pemeriksaan & Lab: {sasaranNama}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>{sasaran?.subCategory?.nama || "Entitas Data Dasar"}</span>
                {sasaran?.alamat && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-sm">{sasaran.alamat}</span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-canvas space-y-4">
          {isLoading ? (
            <div className="space-y-3 p-1 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-surface space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-muted shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 w-48 bg-muted rounded" />
                        <div className="h-3 w-32 bg-muted/60 rounded" />
                      </div>
                    </div>
                    <div className="h-8 w-24 bg-muted rounded-lg shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : riwayatData.length === 0 ? (
            <Card className="border border-dashed border-border bg-surface p-10 text-center flex flex-col items-center justify-center shadow-subtle">
              <div className="w-12 h-12 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center mb-3">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-foreground">Belum Ada Riwayat Pemeriksaan</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Entitas ini belum pernah diinspeksi atau diuji sampel lab-nya oleh sanitarian.
              </p>
              <Button asChild size="sm" className="mt-4 gap-2 font-bold shadow-xs">
                <Link href={`/pemeriksaan?sasaranId=${sasaranId}`}>
                  <Plus className="w-3.5 h-3.5" />
                  Mulai Pemeriksaan Sekarang
                </Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                <span>TOTAL {riwayatData.length} KALI PEMERIKSAAN</span>
                <span>Urutan Terkini &rarr; Terlama</span>
              </div>

              <div className="space-y-2.5">
                {riwayatData.map((res: any, idx: number) => {
                  const isApproved = res.status === "APPROVED";
                  const isLabForm =
                    res.template?.nama?.toLowerCase().includes("lab") ||
                    res.template?.deskripsi?.toLowerCase().includes("lab") ||
                    res.template?.nama?.toLowerCase().includes("uji") ||
                    res.template?.config?.tipePemeriksaan === "LAB";

                  return (
                    <Card
                      key={res.id}
                      className="p-4 border border-border bg-surface hover:border-primary/40 transition-colors shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-black shadow-2xs ${
                              isLabForm
                                ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                                : "bg-primary-subtle text-primary border border-primary/20"
                            }`}
                          >
                            {isLabForm ? <FlaskConical className="w-4 h-4" /> : <FileCheck className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-foreground truncate">
                                #{riwayatData.length - idx}. {res.template?.nama || "Pemeriksaan Lapangan"}
                              </span>
                              <Badge
                                variant={isApproved ? "success" : "warning"}
                                className="text-[9px] font-extrabold uppercase shrink-0"
                              >
                                {isApproved ? "Disetujui" : res.status || "Draft"}
                              </Badge>
                              {isLabForm && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-300 shrink-0"
                                >
                                  Uji Lab
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(res.tanggal || res.createdAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {res.user?.nama || "Sanitarian"}
                              </span>
                              {res.puskesmas?.nama && (
                                <span className="inline-flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  Puskesmas {res.puskesmas.nama}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <Button asChild variant="outline" size="sm" className="h-8 text-xs font-bold gap-1.5">
                            <Link href={`/pemeriksaan?resultId=${res.id}`}>
                              <span>Buka Rincian</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </Button>
                        </div>
                      </div>

                      {res.catatan && (
                        <div className="p-2.5 rounded-lg bg-surface-subtle border border-border/60 text-xs text-muted-foreground italic">
                          &ldquo;{res.catatan}&rdquo;
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-3.5 border-t border-border bg-surface flex sm:items-center sm:justify-between gap-2 shrink-0">
          <Button asChild size="sm" className="font-bold gap-1.5 shadow-xs">
            <Link href={`/pemeriksaan?sasaranId=${sasaranId}`}>
              <Plus className="w-3.5 h-3.5" />
              <span>Isi Pemeriksaan / Lab Baru</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
