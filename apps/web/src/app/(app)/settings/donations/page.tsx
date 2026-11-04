"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Key, Loader2, RefreshCw, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DonationsSettingsPage() {
  const queryClient = useQueryClient();

  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [popupEnabled, setPopupEnabled] = useState(true);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-donations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/donations");
      if (!res.ok) throw new Error("Gagal mengambil data donasi");
      return res.json();
    },
  });

  // Sinkronkan state saat data selesai di-fetch pertama kali
  if (data && !isConfigLoaded) {
    setPopupEnabled(data.config?.popupEnabled ?? true);
    setIsConfigLoaded(true);
  }

  const saveConfigMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan konfigurasi");
      return json;
    },
    onSuccess: () => {
      toast.success("Konfigurasi SumoPod berhasil diperbarui.");
      setApiKey("");
      setWebhookSecret("");
      setWebhookToken("");
      queryClient.invalidateQueries({ queryKey: ["admin-donations"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menyimpan konfigurasi");
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { popupEnabled };
    if (apiKey.trim()) payload.apiKey = apiKey.trim();
    if (webhookSecret.trim()) payload.webhookSecret = webhookSecret.trim();
    if (webhookToken.trim()) payload.webhookToken = webhookToken.trim();

    saveConfigMutation.mutate(payload);
  };

  const donations = data?.donations || [];
  const summary = data?.summary || { totalPaidAmount: 0, totalPaidCount: 0 };
  const config = data?.config || {};

  return (
    <div className="space-y-6">
      {/* ── Ringkasan Donasi ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-border bg-surface">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Total Dana Masuk</p>
          <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            Rp {(summary.totalPaidAmount || 0).toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Dari transaksi terverifikasi PAID</p>
        </Card>

        <Card className="p-4 border-border bg-surface">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Transaksi Sukses</p>
          <p className="text-xl font-black font-mono text-foreground mt-1">{summary.totalPaidCount || 0} donasi</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Metode QRIS SumoPod</p>
        </Card>

        <Card className="p-4 border-border bg-surface">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Status Gateway</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2.5 h-2.5 rounded-full ${config.hasApiKey ? "bg-emerald-500" : "bg-rose-500"}`} />
            <span className="text-xs font-bold text-foreground">
              {config.hasApiKey ? "Terhubung (API Key Aktif)" : "Belum Ada API Key"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Webhook: {config.hasWebhookSecret || config.hasWebhookToken ? "Dilindungi (Valid)" : "Belum diatur"}
          </p>
        </Card>
      </div>

      {/* ── Form Konfigurasi SumoPod ── */}
      <Card className="p-5 border-border bg-surface shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-black text-foreground flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" /> Konfigurasi Gateway SumoPod
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Setel kredensial API dan Webhook dari dashboard merchant SumoPod Anda.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                X-Api-Key SumoPod
              </Label>
              <Input
                type="password"
                placeholder={
                  config.hasApiKey ? "•••••••• (Tersimpan - isi jika ingin mengganti)" : "Contoh: live_sk_..."
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Dipakai untuk request pembuatan tagihan QRIS ke endpoint{" "}
                <code>https://api-pay.sumopod.com/api/v1/payments</code>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Svix Webhook Secret (whsec_...)
              </Label>
              <Input
                type="password"
                placeholder={config.hasWebhookSecret ? "•••••••• (Tersimpan)" : "Contoh: whsec_..."}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Secret HMAC-SHA256 untuk verifikasi signature header <code>svix-signature</code>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Webhook Token Alternatif (x-webhook-token)
              </Label>
              <Input
                type="password"
                placeholder={config.hasWebhookToken ? "•••••••• (Tersimpan)" : "Contoh: whtok_..."}
                value={webhookToken}
                onChange={(e) => setWebhookToken(e.target.value)}
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Token header untuk verifikasi webhook token langsung <code>x-webhook-token</code>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                URL Webhook Sistem
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value="https://kesling.biz.id/api/webhooks/sumopod"
                  className="text-xs font-mono bg-surface-subtle"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText("https://kesling.biz.id/api/webhooks/sumopod");
                    toast.success("URL webhook disalin ke clipboard");
                  }}
                  className="shrink-0 text-xs"
                >
                  Salin URL
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Daftarkan URL di atas pada menu Webhook di dashboard merchant SumoPod Anda.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-3">
              <Switch checked={popupEnabled} onCheckedChange={setPopupEnabled} id="toggle-popup" />
              <Label htmlFor="toggle-popup" className="cursor-pointer text-xs font-bold text-foreground">
                Aktifkan Popup Donasi Otomatis (Muncul berkala 3 hari sekali untuk pengguna login)
              </Label>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={saveConfigMutation.isPending}
              className="rounded-full shadow-xs text-xs font-bold gap-1.5 px-4"
            >
              {saveConfigMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Simpan Pengaturan
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Tabel Riwayat Donasi ── */}
      <Card className="border-border bg-surface shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Riwayat Donasi Masuk</h3>
            <p className="text-[11px] text-muted-foreground">
              Daftar transaksi donasi pengguna yang tercatat dalam sistem
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-donations"] })}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Segarkan
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-surface-subtle/50 text-[11px]">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Donatur</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    Memuat data transaksi...
                  </TableCell>
                </TableRow>
              ) : donations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    Belum ada riwayat transaksi donasi.
                  </TableCell>
                </TableRow>
              ) : (
                donations.map((d: any, idx: number) => {
                  const isPaid = d.status === "PAID";
                  const isExpired = d.status === "EXPIRED";

                  return (
                    <TableRow key={d.id} className="text-xs hover:bg-surface-subtle">
                      <TableCell className="text-center font-mono text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-mono font-bold text-foreground">{d.orderId}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold text-foreground">{d.donorName || "Anonim"}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{d.donorEmail || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground">
                        Rp {d.amount.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                              : isExpired
                                ? "bg-muted text-muted-foreground"
                                : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">
                        {new Date(d.createdAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
