"use client";

import { Check, Eraser, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SignaturePadProps {
  value: string | null;
  onChange: (base64: string) => void;
  label?: string;
  helperText?: string;
}

export function SignaturePad({ value, onChange, label, helperText }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const hasDrawn = useRef(false);
  const lastDrawnValue = useRef<string | null>(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0f172a";
    }
  }, []);

  // Sync canvas internal resolution with ResizeObserver
  useEffect(() => {
    resizeCanvas();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (!hasDrawn.current) {
        resizeCanvas();
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? (e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX) : e.clientX;
    const clientY = "touches" in e ? (e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY) : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // Draw existing value (base64 image) to canvas on mount or when value changes externally
  useEffect(() => {
    if (value && value === lastDrawnValue.current) {
      return;
    }
    if (value && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          if (canvas.width === 0) {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
          }
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const rect = canvas.getBoundingClientRect();
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          hasDrawn.current = true;
        };
        img.src = value;
      }
    } else if (!value && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasDrawn.current = false;
      }
    }
  }, [value]);

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasDrawn.current = true;
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasDrawn.current) {
      const dataUrl = canvas.toDataURL("image/png");
      lastDrawnValue.current = dataUrl;
      onChange(dataUrl);
    }
  };

  const clearCanvas = (e: React.MouseEvent) => {
    e.stopPropagation();
    hasDrawn.current = false;
    lastDrawnValue.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onChange("");
    }
  };

  return (
    <div className="space-y-2.5">
      <div
        ref={containerRef}
        className="relative w-full h-52 sm:h-60 rounded-2xl border-2 border-dashed border-[hsl(var(--border))] bg-white dark:bg-zinc-950 overflow-hidden shadow-sm group touch-none cursor-crosshair transition-all hover:border-[#00A876]/50 focus-within:border-[#00A876]"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />

        {/* Watermark Guidelines */}
        <div className="absolute inset-x-6 bottom-10 flex items-center gap-2 pointer-events-none opacity-30">
          <span className="text-[14px] font-bold text-slate-400">✕</span>
          <div className="flex-1 border-b-2 border-dashed border-slate-300" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            {helperText || "Garis Tanda Tangan"}
          </span>
        </div>

        {!value && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <span className="text-[13px] font-bold text-slate-400/80">{label ?? "Tanda tangan di sini"}</span>
            <span className="text-[10px] text-slate-400/60 mt-1">Gores menggunakan jari atau stylus</span>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {value && (
            <button
              type="button"
              onClick={clearCanvas}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-[11px] font-bold border border-slate-200 transition-colors shadow-sm"
              title="Hapus dan tanda tangani ulang"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Ulangi
            </button>
          )}
          {!value && hasDrawn.current && (
            <button
              type="button"
              onClick={clearCanvas}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] transition-colors"
              title="Hapus"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        {value ? (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#00A876]">
            <Check className="w-3.5 h-3.5" /> Tanda tangan telah tersimpan
          </div>
        ) : (
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
            Pastikan tanda tangan jelas dan tidak melewati batas area.
          </span>
        )}
      </div>
    </div>
  );
}
