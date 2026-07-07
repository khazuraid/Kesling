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

export default function AISettingsPage() {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");

  const { data: settings, isLoading } = useQuery<AISettings>({
    queryKey: ["settings", "ai"],
    queryFn: () => fetch("/api/settings/ai").then((r) => r.json()),
  });

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider || "openrouter");
      setApiKey(settings.apiKey || "");
      setModel(settings.model || "google/gemini-2.5-flash");
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 border border-[hsl(var(--border))]">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  const modelOptions: Record<string, string[]> = {
    openrouter: [
      "google/gemini-2.5-flash",
      "openai/gpt-4.1-mini",
      "anthropic/claude-3.5-haiku",
      "anthropic/claude-3.5-sonnet",
      "deepseek/deepseek-chat",
    ],
    openai: ["gpt-4.1-mini", "gpt-4o-mini", "gpt-4o", "gpt-4.1"],
    gemini: ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
  };

  return (
    <div className="space-y-6 border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 fade-in">
      <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] pb-4">
        <Sparkles className="w-6 h-6 text-[hsl(var(--accent))]" />
        <div>
          <h2 className="text-[14px] font-bold text-[hsl(var(--foreground))]">Konfigurasi AI Normalizer</h2>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            Atur penyedia API AI dan model yang digunakan saat mengimpor formulir pemeriksaan (PDF & Word).
          </p>
        </div>
      </div>

      <div className="space-y-4 max-w-xl">
        {/* Provider */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
            Penyedia AI (Provider)
          </label>
          <select
            value={provider}
            onChange={(e) => {
              const newProv = e.target.value;
              setProvider(newProv);
              if (newProv !== "disabled" && modelOptions[newProv]) {
                setModel(modelOptions[newProv][0]);
              }
            }}
            className="w-full h-10 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-bold text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors cursor-pointer"
          >
            <option value="openrouter">OpenRouter (Direkomendasikan - Banyak Model)</option>
            <option value="openai">OpenAI (ChatGPT API)</option>
            <option value="gemini">Google Gemini API</option>
            <option value="disabled">Nonaktifkan AI (Hanya Gunakan Parser Lokal)</option>
          </select>
        </div>

        {provider !== "disabled" && (
          <>
            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[hsl(var(--foreground))] uppercase tracking-wider flex items-center justify-between">
                <span>API Key</span>
                {settings?.hasKey && (
                  <span className="text-[10px] text-[hsl(var(--accent))] font-normal flex items-center gap-1">
                    <Check className="w-3 h-3" /> Tersimpan di database
                  </span>
                )}
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-[hsl(var(--muted-foreground))] absolute left-3 top-3" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings?.hasKey ? "•••••••••••••••• (sudah tersimpan)" : "Masukkan API Key rahasia..."}
                  className="w-full h-10 pl-9 pr-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-mono text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors"
                />
              </div>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                {provider === "openrouter" && "Dapatkan API key dari https://openrouter.ai/keys"}
                {provider === "openai" && "Dapatkan API key dari platform.openai.com/api-keys"}
                {provider === "gemini" && "Dapatkan API key dari aistudio.google.com/app/apikey"}
              </p>
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
                Model AI yang Digunakan
              </label>
              <div className="flex gap-2">
                <select
                  value={modelOptions[provider]?.includes(model) ? model : "custom"}
                  onChange={(e) => {
                    if (e.target.value !== "custom") {
                      setModel(e.target.value);
                    }
                  }}
                  className="w-full h-10 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-bold text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors cursor-pointer"
                >
                  {modelOptions[provider]?.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  <option value="custom">-- Ketik Model Lainnya --</option>
                </select>
              </div>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Nama model kustom (contoh: meta-llama/llama-3-70b-instruct)"
                className="w-full h-9 px-3 mt-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[11px] font-mono text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors"
              />
            </div>
          </>
        )}

        <div className="pt-4">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-10 px-6 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[12px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan Konfigurasi AI
          </button>
        </div>
      </div>
    </div>
  );
}
