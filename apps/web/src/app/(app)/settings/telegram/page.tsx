"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, Eye, EyeOff, Link2, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const inputCls =
  "w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-[12px] font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-subtle transition-all placeholder:text-muted-foreground";
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
        else if (action === "testAdmin") toast.success("Pesan test berhasil dikirim!");
      } else {
        toast.error(data.error || "Aksi gagal");
      }
    },
    onError: () => toast.error("Gagal menjalankan aksi"),
  });

  return (
    <div className="max-w-3xl space-y-5">
      {/* Status banner */}
      <div className="rounded-card bg-surface border border-border shadow-subtle p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              settings?.hasToken
                ? "bg-primary-subtle text-primary border-primary/20"
                : "bg-warning-light text-warning border-warning/20"
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

        <span
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-[11px] font-bold uppercase tracking-wider border ${
            settings?.hasToken
              ? "bg-primary-subtle text-primary border-primary/25"
              : "bg-warning-light text-warning border-warning/25"
          }`}
        >
          {settings?.hasToken ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" /> Bot Aktif
            </>
          ) : (
            "Belum dikonfigurasi"
          )}
        </span>
      </div>

      {/* Kredensial Form */}
      <div className="rounded-card bg-surface border border-border shadow-subtle p-6 space-y-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kredensial Bot</p>

        <div>
          <label className={labelCls}>Bot Token</label>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={form.telegramBotToken}
              onChange={(e) => setForm({ ...form, telegramBotToken: e.target.value })}
              placeholder="Dapatkan dari @BotFather di Telegram"
              className={`${inputCls} pr-11 font-mono`}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              title={showToken ? "Sembunyikan token" : "Tampilkan token"}
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className={hintCls}>Buat bot baru via @BotFather → /newbot → salin token-nya ke sini</p>
        </div>

        {/* Toggle Switch Show Token */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-subtle border border-border">
          <span className="text-[12px] font-semibold text-foreground">Tampilkan Token Bot</span>
          <button
            type="button"
            role="switch"
            aria-checked={showToken}
            onClick={() => setShowToken(!showToken)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              showToken ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                showToken ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Admin Chat ID</label>
            <input
              value={form.telegramAdminChatId}
              onChange={(e) => setForm({ ...form, telegramAdminChatId: e.target.value })}
              placeholder="Contoh: 123456789"
              className={inputCls}
            />
            <p className={hintCls}>Untuk alert error sistem (developer/IT)</p>
          </div>
          <div>
            <label className={labelCls}>Dinkes Chat ID</label>
            <input
              value={form.telegramDinkesChatId}
              onChange={(e) => setForm({ ...form, telegramDinkesChatId: e.target.value })}
              placeholder="Contoh: -1001234567890"
              className={inputCls}
            />
            <p className={hintCls}>Grup/personal Dinkes untuk notifikasi laporan</p>
          </div>
        </div>

        <div>
          <label className={labelCls}>
            Webhook Secret <span className="font-normal normal-case">(opsional)</span>
          </label>
          <input
            value={form.telegramWebhookSecret}
            onChange={(e) => setForm({ ...form, telegramWebhookSecret: e.target.value })}
            placeholder="String acak untuk keamanan webhook"
            className={inputCls}
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-primary text-white text-[11px] font-bold uppercase tracking-wider hover:bg-primary-hover shadow-subtle transition-all disabled:opacity-50 cursor-pointer"
          >
            {saveMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>
      </div>

      {/* Webhook Form */}
      <div className="rounded-card bg-surface border border-border shadow-subtle p-6 space-y-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Manajemen Webhook</p>

        <div>
          <label className={labelCls}>URL Aplikasi</label>
          <input
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
            placeholder="https://domain-anda.com"
            className={inputCls}
          />
          <p className={hintCls}>
            Webhook didaftarkan ke:{" "}
            <span className="font-mono text-primary font-bold">{appUrl}/api/telegram/webhook</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => actionMutation.mutate("setWebhook")}
            disabled={actionMutation.isPending || !settings?.hasToken}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-white text-[11px] font-bold uppercase tracking-wider hover:bg-primary-hover shadow-subtle transition-all cursor-pointer disabled:opacity-40"
          >
            <Link2 className="w-3.5 h-3.5" /> Daftarkan Webhook
          </button>
          <button
            type="button"
            onClick={() => actionMutation.mutate("testAdmin")}
            disabled={actionMutation.isPending || !settings?.hasToken}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-surface border border-border text-foreground text-[11px] font-bold uppercase tracking-wider hover:border-primary hover:text-primary shadow-subtle transition-all cursor-pointer disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" /> Test Kirim Pesan
          </button>
          <button
            type="button"
            onClick={() => actionMutation.mutate("deleteWebhook")}
            disabled={actionMutation.isPending || !settings?.hasToken}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-surface border border-error/30 text-error text-[11px] font-bold uppercase tracking-wider hover:bg-error-light shadow-subtle transition-all cursor-pointer disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hapus Webhook
          </button>
        </div>

        {!settings?.hasToken && (
          <div className="rounded-xl border border-warning/25 bg-warning-light px-4 py-3 text-[11px] font-semibold text-warning">
            Simpan Bot Token terlebih dahulu untuk mengaktifkan webhook dan pengiriman pesan.
          </div>
        )}
      </div>
    </div>
  );
}
