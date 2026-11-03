"use client";

import React, { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: (error: unknown) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface TurnstileRef {
  reset: () => void;
}

interface TurnstileProps {
  onSuccess: (token: string) => void;
  onError?: (error: unknown) => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
  className?: string;
  ref?: React.Ref<TurnstileRef>;
}

export function Turnstile({
  onSuccess,
  onError,
  onExpire,
  theme = "auto",
  size = "normal",
  className,
  ref,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  React.useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {}
      }
    },
  }));

  // Simpan callback dalam ref agar perubahan callback tidak memicu re-render widget pada setiap ketikan input form
  const callbacksRef = useRef({ onSuccess, onError, onExpire });
  useEffect(() => {
    callbacksRef.current = { onSuccess, onError, onExpire };
  });

  useEffect(() => {
    // Jika siteKey belum diatur, komponen tidak perlu merender apa-apa
    if (!siteKey || !containerRef.current) return;

    let isMounted = true;

    function renderWidget() {
      if (!window.turnstile || !containerRef.current || !isMounted) return;

      // Bersihkan widget sebelumnya hanya jika masih terpasang di DOM
      if (widgetIdRef.current) {
        const prevId = widgetIdRef.current;
        widgetIdRef.current = null;
        try {
          if (containerRef.current && document.body.contains(containerRef.current)) {
            window.turnstile.remove(prevId);
          }
        } catch {}
      }

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey as string,
          callback: (token: string) => {
            if (isMounted) callbacksRef.current.onSuccess(token);
          },
          "error-callback": (err: unknown) => {
            if (isMounted && callbacksRef.current.onError) callbacksRef.current.onError(err);
          },
          "expired-callback": () => {
            if (isMounted && callbacksRef.current.onExpire) callbacksRef.current.onExpire();
          },
          theme,
          size,
        });
      } catch {
        // Abaikan log error di console klien
      }
    }

    // Periksa apakah skrip Turnstile sudah dimuat
    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.querySelector('script[src*="turnstile/v0/api.js"]');
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (isMounted) renderWidget();
        };
        document.head.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            if (isMounted) renderWidget();
          }
        }, 100);
        return () => {
          isMounted = false;
          clearInterval(interval);
        };
      }
    }

    return () => {
      isMounted = false;
      const wid = widgetIdRef.current;
      widgetIdRef.current = null;
      if (wid && window.turnstile) {
        try {
          if (containerRef.current && document.body.contains(containerRef.current)) {
            window.turnstile.remove(wid);
          }
        } catch {}
      }
    };
  }, [siteKey, theme, size]);

  if (!siteKey) return null;

  return (
    <div className={className}>
      <div ref={containerRef} className="flex justify-center w-full min-h-[65px]" />
    </div>
  );
}
