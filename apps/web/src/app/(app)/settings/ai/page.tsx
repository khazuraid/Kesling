"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Key, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface AISettings {
  provider: string;
  apiKey: string;
  hasKey: boolean;
  model: string;
}

const inputCls =
  "w-full h-10 px-3.5 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[#00A876] focus:shadow-[0_0_0_3px_rgba(0,168,118,0.12)] transition-all";
const labelCls =
  "block text-[9px] font-extrabold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))] mb-1.5";
const hintCls = "text-[10px] font-medium text-[hsl(var(--muted-foreground))] mt-1.5 leading-relaxed";

export default function AISettingsPage() {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("google/gemini-3.8-flash");

  const { data: settings, isLoading } = useQuery<AISettings>({
    queryKey: ["settings", "ai"],
    queryFn: () => fetch("/api/settings/ai").then((r) => r.json()),
  });

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider || "openrouter");
      setApiKey(settings.apiKey || "");
      setModel(settings.model || "google/gemini-3.8-flash");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, model }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      toast.success("Konfigurasi AI berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["settings", "ai"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const modelOptions: Record<string, string[]> = {
    openrouter: [
      "google/gemini-3.8-flash",
      "google/gemini-3.5-flash",
      "openai/gpt-5.6-luna",
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-fable-5.1",
      "deepseek/deepseek-v3.2",
    ],
    openai: ["gpt-5.6-luna", "gpt-5-mini", "gpt-5", "gpt-4.1-mini"],
    gemini: ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-pro"],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[hsl(var(--border))] border-t-[#00A876] animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Status banner */}
      <div className="rounded-2xl border border-[#00A876]/20 bg-[#00A876]/[0.04] px-5 py-4 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-[#00A876]/15 text-[#00A876] flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </span>
        <div>
          <p className="text-[13px] font-extrabold text-[hsl(var(--foreground))]">AI Normalizer</p>
          <p className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] mt-0.5">
            Provider & model untuk impor formulir pemeriksaan (PDF & Word)
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
        <div>
          <label className={labelCls}>Penyedia AI (Provider)</label>
          <select
            value={provider}
            onChange={(e) => {
              const newProv = e.target.value;
              setProvider(newProv);
              if (newProv !== "disabled" && modelOptions[newProv]) {
                setModel(modelOptions[newProv][0]);
              }
            }}
            className={inputCls}
          >
            <option value="openrouter">OpenRouter (Direkomendasikan — Banyak Model)</option>
            <option value="openai">OpenAI (ChatGPT API)</option>
            <option value="gemini">Google Gemini API</option>
            <option value="disabled">Nonaktifkan AI (Hanya Parser Lokal)</option>
          </select>
        </div>

        {provider !== "disabled" && (
          <>
            <div>
              <label className={labelCls}>
                API Key
                {settings?.hasKey && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[9px] font-extrabold text-[#00A876] normal-case tracking-normal">
                    <Check className="w-3 h-3" /> Tersimpan
                  </span>
                )}
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-[hsl(var(--muted-foreground))] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings?.hasKey ? "•••••••••••••••• (sudah tersimpan)" : "Masukkan API Key rahasia..."}
                  className={`${inputCls} pl-10 font-mono`}
                />
              </div>
              <p className={hintCls}>
                {provider === "openrouter" && "Dapatkan API key dari https://openrouter.ai/keys"}
                {provider === "openai" && "Dapatkan API key dari platform.openai.com/api-keys"}
                {provider === "gemini" && "Dapatkan API key dari aistudio.google.com/app/apikey"}
              </p>
            </div>

            <div>
              <label className={labelCls}>Model AI</label>
              <select
                value={modelOptions[provider]?.includes(model) ? model : "custom"}
                onChange={(e) => {
                  if (e.target.value !== "custom") {
                    setModel(e.target.value);
                  }
                }}
                className={inputCls}
              >
                {modelOptions[provider]?.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="custom">-- Ketik Model Lainnya --</option>
              </select>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Nama model kustom (contoh: meta-llama/llama-3-70b-instruct)"
                className={`${inputCls} mt-2 font-mono text-[11px]`}
              />
            </div>
          </>
        )}

        <div className="pt-1 flex justify-end">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-[#BEF264] text-[#06281E] text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 transition disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Simpan Konfigurasi AI
          </button>
        </div>
      </div>
    </div>
  );
}
