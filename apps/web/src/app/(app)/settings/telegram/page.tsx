"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, Eye, EyeOff, Link2, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const inputCls =
  "w-full h-10 px-3.5 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[#00A876] focus:shadow-[0_0_0_3px_rgba(0,168,118,0.12)] transition-all";
const labelCls =
  "block text-[9px] font-extrabold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))] mb-1.5";
const hintCls = "text-[10px] font-medium text-[hsl(var(--muted-foreground))] mt-1.5 leading-relaxed";

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

  return (
    <div className="max-w-2xl space-y-4">
      {/* Status banner */}
      <div
        className={`rounded-2xl border px-5 py-4 flex items-center gap-3 ${
          settings?.hasToken ? "border-[#00A876]/25 bg-[#00A876]/[0.05]" : "border-[#E8A33D]/25 bg-[#E8A33D]/[0.05]"
        }`}
      >
        <span
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            settings?.hasToken ? "bg-[#00A876]/15 text-[#00A876]" : "bg-[#E8A33D]/15 text-[#C07F1F]"
          }`}
        >
          <Bot className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-extrabold text-[hsl(var(--foreground))]">Telegram Bot</p>
          <p className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] mt-0.5">
            Notifikasi approval, laporan, dan error sistem
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
            settings?.hasToken
              ? "bg-[#00A876]/10 text-[#00A876] border border-[#00A876]/25"
              : "bg-[#E8A33D]/10 text-[#C07F1F] border border-[#E8A33D]/25"
          }`}
        >
          {settings?.hasToken ? (
            <>
              <CheckCircle2 className="w-3 h-3" /> Aktif
            </>
          ) : (
            "Belum dikonfigurasi"
          )}
        </span>
      </div>

      {/* Kredensial */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
          Kredensial Bot
        </p>

        <div>
          <label className={labelCls}>Bot Token</label>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={form.telegramBotToken}
              onChange={(e) => setForm({ ...form, telegramBotToken: e.target.value })}
              placeholder="Dapatkan dari @BotFather di Telegram"
              className={`${inputCls} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[#00A876] transition-colors"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className={hintCls}>Buat bot baru via @BotFather → /newbot → salin token-nya ke sini</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Admin Chat ID</label>
            <input
              value={form.telegramAdminChatId}
              onChange={(e) => setForm({ ...form, telegramAdminChatId: e.target.value })}
              placeholder="123456789"
              className={inputCls}
            />
            <p className={hintCls}>Untuk alert error sistem (developer/IT)</p>
          </div>
          <div>
            <label className={labelCls}>Dinkes Chat ID</label>
            <input
              value={form.telegramDinkesChatId}
              onChange={(e) => setForm({ ...form, telegramDinkesChatId: e.target.value })}
              placeholder="-1001234567890"
              className={inputCls}
            />
            <p className={hintCls}>Grup/personal Dinkes untuk notifikasi laporan</p>
          </div>
        </div>

        <div>
          <label className={labelCls}>
            Webhook Secret <span className="font-medium normal-case">(opsional)</span>
          </label>
          <input
            value={form.telegramWebhookSecret}
            onChange={(e) => setForm({ ...form, telegramWebhookSecret: e.target.value })}
            placeholder="String acak untuk keamanan webhook"
            className={inputCls}
          />
        </div>

        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-[#BEF264] text-[#06281E] text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 transition disabled:opacity-50"
          >
            {saveMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>
      </div>

      {/* Webhook */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
          Manajemen Webhook
        </p>

        <div>
          <label className={labelCls}>URL Aplikasi</label>
          <input
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
            placeholder="https://domain-anda.com"
            className={inputCls}
          />
          <p className={hintCls}>
            Webhook didaftarkan ke: <span className="font-mono text-[#00A876]">{appUrl}/api/telegram/webhook</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => actionMutation.mutate("setWebhook")}
            disabled={actionMutation.isPending || !settings?.hasToken}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#BEF264] text-[#06281E] text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 transition disabled:opacity-40"
          >
            <Link2 className="w-3.5 h-3.5" /> Daftarkan
          </button>
          <button
            type="button"
            onClick={() => actionMutation.mutate("testAdmin")}
            disabled={actionMutation.isPending || !settings?.hasToken}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-[11px] font-extrabold uppercase tracking-wider hover:border-[#00A876] hover:text-[#00A876] transition disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" /> Test Admin
          </button>
          <button
            type="button"
            onClick={() => actionMutation.mutate("deleteWebhook")}
            disabled={actionMutation.isPending || !settings?.hasToken}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-[#E15A4F]/40 text-[#E15A4F] text-[11px] font-extrabold uppercase tracking-wider hover:bg-[#E15A4F]/10 transition disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hapus
          </button>
        </div>

        {!settings?.hasToken && (
          <div className="rounded-xl border border-[#E8A33D]/25 bg-[#E8A33D]/[0.06] px-4 py-3 text-[11px] font-semibold text-[#C07F1F]">
            Simpan Bot Token terlebih dahulu untuk mengaktifkan webhook.
          </div>
        )}
      </div>
    </div>
  );
}
