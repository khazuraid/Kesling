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
  "w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-[12px] font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-subtle transition-all placeholder:text-muted-foreground";
const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5";
const hintCls = "text-[11px] font-medium text-muted-foreground mt-1.5 leading-relaxed";

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

  const isAiEnabled = provider !== "disabled";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-border border-t-primary animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Status banner */}
      <div className="rounded-card bg-surface border border-border shadow-subtle p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="w-10 h-10 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <p className="text-[13px] font-bold text-foreground">AI Normalizer</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
              Provider & model untuk impor formulir pemeriksaan (PDF & Word)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAiEnabled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-[11px] font-bold bg-primary-subtle text-primary border border-primary/25">
              <Check className="w-3.5 h-3.5" /> AI Aktif ({provider.toUpperCase()})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-[11px] font-bold bg-surface-subtle text-muted-foreground border border-border">
              Nonaktif
            </span>
          )}
        </div>
      </div>

      {/* Form Container */}
      <div className="rounded-card bg-surface border border-border shadow-subtle p-6 space-y-5">
        {/* Toggle Switch */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-surface-subtle border border-border">
          <div>
            <p className="text-[12px] font-bold text-foreground">Gunakan Parser AI</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Ekstraksi cerdas field formulir menggunakan LLM</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isAiEnabled}
            onClick={() => {
              if (isAiEnabled) {
                setProvider("disabled");
              } else {
                setProvider("openrouter");
                if (modelOptions.openrouter) setModel(modelOptions.openrouter[0]);
              }
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              isAiEnabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isAiEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {isAiEnabled && (
          <>
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
              </select>
            </div>

            <div>
              <label className={labelCls}>
                API Key
                {settings?.hasKey && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-primary normal-case tracking-normal">
                    <Check className="w-3 h-3" /> Tersimpan
                  </span>
                )}
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
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

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-primary text-white text-[11px] font-bold uppercase tracking-wider hover:bg-primary-hover shadow-subtle transition-all disabled:opacity-50 cursor-pointer"
          >
            {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Simpan Konfigurasi AI
          </button>
        </div>
      </div>
    </div>
  );
}
