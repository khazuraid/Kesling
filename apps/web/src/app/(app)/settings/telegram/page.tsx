"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, Eye, EyeOff, Link, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function TelegramSettingsPage() {
  const queryClient = useQueryClient();
  const [showToken, setShowToken] = useState(false);
  const [form, setForm] = useState({
    telegramBotToken: "",
    telegramAdminChatId: "",
    telegramDinkesChatId: "",
    telegramWebhookSecret: "",
  });
  const [appUrl, setAppUrl] = useState(typeof window !== "undefined" ? window.location.origin : "");
  const [initialized, setInitialized] = useState(false);

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

  const inputClass =
    "w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors";
  const labelClass = "text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-1.5";

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center">
          <Bot className="w-4 h-4 text-[hsl(var(--foreground))]" />
        </div>
        <div>
          <h2 className="text-[13px] font-bold text-[hsl(var(--foreground))]">Telegram Bot</h2>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
            Konfigurasi bot Telegram untuk notifikasi approval, laporan, dan error sistem
          </p>
        </div>
        {settings?.hasToken && (
          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-[hsl(var(--success))] uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Aktif
          </span>
        )}
      </div>

      {/* Token & Chat IDs */}
      <div className="border border-[hsl(var(--border))] p-5 space-y-4 mb-4">
        <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
          Kredensial Bot
        </p>

        <div>
          <label className={labelClass}>Bot Token</label>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={form.telegramBotToken}
              onChange={(e) => setForm({ ...form, telegramBotToken: e.target.value })}
              placeholder="Dapatkan dari @BotFather di Telegram"
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
            Buat bot baru via @BotFather → /newbot → salin token-nya ke sini
          </p>
        </div>

        <div>
          <label className={labelClass}>Admin Chat ID</label>
          <input
            value={form.telegramAdminChatId}
            onChange={(e) => setForm({ ...form, telegramAdminChatId: e.target.value })}
            placeholder="Contoh: 123456789 (untuk notifikasi error sistem)"
            className={inputClass}
          />
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
            Chat ID developer/IT yang menerima alert error. Kirim /start ke bot lalu cek /api/telegram/webhook atau
            getUpdates.
          </p>
        </div>

        <div>
          <label className={labelClass}>Dinkes Chat ID</label>
          <input
            value={form.telegramDinkesChatId}
            onChange={(e) => setForm({ ...form, telegramDinkesChatId: e.target.value })}
            placeholder="Contoh: -1001234567890 (grup Dinkes)"
            className={inputClass}
          />
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
            Chat ID grup atau personal Dinkes untuk menerima notifikasi laporan masuk baru.
          </p>
        </div>

        <div>
          <label className={labelClass}>
            Webhook Secret <span className="font-medium normal-case">(opsional)</span>
          </label>
          <input
            value={form.telegramWebhookSecret}
            onChange={(e) => setForm({ ...form, telegramWebhookSecret: e.target.value })}
            placeholder="String acak untuk keamanan webhook"
            className={inputClass}
          />
        </div>

        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-9 px-5 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--accent))] hover:text-white transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>
      </div>

      {/* Webhook Management */}
      <div className="border border-[hsl(var(--border))] p-5 space-y-4">
        <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
          Manajemen Webhook
        </p>

        <div>
          <label className={labelClass}>URL Aplikasi (untuk webhook)</label>
          <input
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
            placeholder="https://domain-anda.com"
            className={inputClass}
          />
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
            Webhook akan didaftarkan ke: <span className="font-mono">{appUrl}/api/telegram/webhook</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => actionMutation.mutate("setWebhook")}
            disabled={actionMutation.isPending || !settings?.hasToken}
            className="flex items-center gap-2 h-9 px-4 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--accent))] hover:text-white transition-colors disabled:opacity-40"
          >
            <Link className="w-3.5 h-3.5" />
            Daftarkan Webhook
          </button>

          <button
            type="button"
            onClick={() => actionMutation.mutate("testAdmin")}
            disabled={actionMutation.isPending || !settings?.hasToken}
            className="flex items-center gap-2 h-9 px-4 bg-transparent border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            Test Kirim ke Admin
          </button>

          <button
            type="button"
            onClick={() => actionMutation.mutate("deleteWebhook")}
            disabled={actionMutation.isPending || !settings?.hasToken}
            className="flex items-center gap-2 h-9 px-4 bg-transparent border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--error))] transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus Webhook
          </button>
        </div>

        {!settings?.hasToken && (
          <p className="text-[11px] text-[hsl(var(--warning))] mt-1">
            ⚠ Simpan Bot Token terlebih dahulu untuk mengaktifkan webhook.
          </p>
        )}
      </div>
    </div>
  );
}
