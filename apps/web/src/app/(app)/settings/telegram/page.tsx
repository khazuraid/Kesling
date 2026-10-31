"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, Eye, EyeOff, Link2, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5";
const hintCls = "text-[11px] font-medium text-muted-foreground mt-1.5 leading-relaxed";

export default function TelegramSettingsPage() {
  const queryClient = useQueryClient();
  const [showToken, setShowToken] = useState(false);
  const [form, setForm] = useState({
    telegramBotToken: "",
    telegramAdminChatId: "",
    telegramDinkesChatId: "",
    telegramWebhookSecret: "",
  });
  const [appUrl, setAppUrl] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin);
    }
  }, []);

  const { data: settings } = useQuery<any>({
    queryKey: ["settings", "telegram"],
    queryFn: () => fetch("/api/settings/telegram").then((r) => r.json()),
  });

  useEffect(() => {
    if (settings && !initialized) {
      setForm((prev) => ({
        ...prev,
        telegramBotToken: settings.hasToken ? "********" : "",
        telegramAdminChatId: settings.telegramAdminChatId || "",
        telegramDinkesChatId: settings.telegramDinkesChatId || "",
        telegramWebhookSecret: settings.telegramWebhookSecret || "",
      }));
      setInitialized(true);
    }
  }, [settings, initialized]);

  const saveMutation = useMutation({
    mutationFn: () =>
      fetch("/api/settings/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.ok) {
        toast.success("Pengaturan Telegram berhasil disimpan");
        queryClient.invalidateQueries({ queryKey: ["settings", "telegram"] });
        setInitialized(false);
      } else {
        toast.error(data.error || "Gagal menyimpan");
      }
    },
    onError: () => toast.error("Gagal menyimpan pengaturan"),
  });

  const actionMutation = useMutation({
    mutationFn: (action: string) =>
      fetch("/api/settings/telegram", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, appUrl }),
      }).then((r) => r.json()),
    onSuccess: (data, action) => {
      if (data.ok) {
        if (action === "setWebhook") toast.success(`Webhook aktif: ${data.webhookUrl}`);
        else if (action === "deleteWebhook") toast.success("Webhook berhasil dihapus");
        else if (action === "testAdmin") toast.success("Pesan test ke Admin berhasil dikirim!");
        else if (action === "testDinkes") toast.success("Pesan test ke Dinkes berhasil dikirim!");
      } else {
        toast.error(data.error || "Aksi gagal");
      }
    },
    onError: () => toast.error("Gagal menjalankan aksi"),
  });

  return (
    <div className="max-w-3xl space-y-5">
      {/* Status banner */}
      <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-subtle">
        <div className="flex items-center gap-3.5">
          <span
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              settings?.hasToken
                ? "bg-primary-subtle text-primary border-primary/20"
                : "bg-warning/10 text-warning border-warning/20"
            }`}
          >
            <Bot className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground">Telegram Bot</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
              Notifikasi approval, laporan, dan error sistem
            </p>
          </div>
        </div>

        {settings?.hasToken ? (
          <Badge variant="success" className="gap-1.5 py-1 px-3 text-[11px] uppercase tracking-wider font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Bot Aktif
          </Badge>
        ) : (
          <Badge variant="warning" className="py-1 px-3 text-[11px] uppercase tracking-wider font-bold">
            Belum dikonfigurasi
          </Badge>
        )}
      </Card>

      {/* Kredensial Form */}
      <Card className="p-6 space-y-5 shadow-subtle">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kredensial Bot</p>

        <div>
          <Label className={labelCls}>Bot Token</Label>
          <div className="relative">
            <Input
              type={showToken ? "text" : "password"}
              value={form.telegramBotToken}
              onChange={(e) => setForm({ ...form, telegramBotToken: e.target.value })}
              placeholder="Dapatkan dari @BotFather di Telegram"
              className="pr-11 font-mono h-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-primary"
              title={showToken ? "Sembunyikan token" : "Tampilkan token"}
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <p className={hintCls}>Buat bot baru via @BotFather → /newbot → salin token-nya ke sini</p>
        </div>

        {/* Toggle Switch Show Token */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-subtle border border-border">
          <span className="text-[12px] font-semibold text-foreground">Tampilkan Token Bot</span>
          <Switch checked={showToken} onCheckedChange={setShowToken} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className={labelCls}>Admin Chat ID</Label>
            <Input
              value={form.telegramAdminChatId}
              onChange={(e) => setForm({ ...form, telegramAdminChatId: e.target.value })}
              placeholder="Contoh: 123456789"
              className="h-10"
            />
            <p className={hintCls}>Untuk alert error sistem (developer/IT)</p>
          </div>
          <div>
            <Label className={labelCls}>Dinkes Chat ID</Label>
            <Input
              value={form.telegramDinkesChatId}
              onChange={(e) => setForm({ ...form, telegramDinkesChatId: e.target.value })}
              placeholder="Contoh: -1001234567890"
              className="h-10"
            />
            <p className={hintCls}>Grup/personal Dinkes untuk notifikasi laporan</p>
          </div>
        </div>

        <div>
          <Label className={labelCls}>
            Webhook Secret <span className="font-normal normal-case">(opsional)</span>
          </Label>
          <Input
            value={form.telegramWebhookSecret}
            onChange={(e) => setForm({ ...form, telegramWebhookSecret: e.target.value })}
            placeholder="String acak untuk keamanan webhook"
            className="h-10"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-10 px-6 rounded-full uppercase tracking-wider text-[11px] font-bold shadow-subtle"
          >
            {saveMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </div>
      </Card>

      {/* Webhook Form */}
      <Card className="p-6 space-y-5 shadow-subtle">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Manajemen Webhook</p>

        <div>
          <label className={labelCls}>URL Aplikasi</label>
          <Input
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
            placeholder="https://domain-anda.com"
            className="h-10"
          />
          <p className={hintCls}>
            Webhook didaftarkan ke:{" "}
            <span className="font-mono text-primary font-bold">{appUrl}/api/telegram/webhook</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <Button
            type="button"
            onClick={() => actionMutation.mutate("setWebhook")}
            disabled={actionMutation.isPending || !settings?.hasToken}
            className="gap-2 h-10 px-5 rounded-full uppercase tracking-wider text-[11px] font-bold shadow-subtle"
          >
            <Link2 className="w-3.5 h-3.5" /> Daftarkan Webhook
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => actionMutation.mutate("testAdmin")}
            disabled={actionMutation.isPending || !settings?.hasToken}
            className="gap-2 h-10 px-5 rounded-full uppercase tracking-wider text-[11px] font-bold shadow-subtle"
          >
            <Send className="w-3.5 h-3.5" /> Test Admin
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => actionMutation.mutate("testDinkes")}
            disabled={actionMutation.isPending || !settings?.hasToken}
            className="gap-2 h-10 px-5 rounded-full uppercase tracking-wider text-[11px] font-bold shadow-subtle"
          >
            <Send className="w-3.5 h-3.5" /> Test Dinkes
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => actionMutation.mutate("deleteWebhook")}
            disabled={actionMutation.isPending || !settings?.hasToken}
            className="gap-2 h-10 px-5 rounded-full uppercase tracking-wider text-[11px] font-bold shadow-subtle"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hapus Webhook
          </Button>
        </div>

        {!settings?.hasToken && (
          <div className="rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-[11px] font-semibold text-warning">
            Simpan Bot Token terlebih dahulu untuk mengaktifkan webhook dan pengiriman pesan.
          </div>
        )}
      </Card>
    </div>
  );
}
