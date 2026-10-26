"use client";

import { useEffect } from "react";

/**
 * Penangkap error tingkat root. Ini menggantikan <html>/<body> saat render
 * gagal, jadi styling tidak boleh bergantung pada stylesheet aplikasi.
 * Pesan error tidak ditampilkan ke pengguna (bisa memuat detail internal).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#0f172a",
          color: "#e2e8f0",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>Aplikasi Gagal Dimuat</h1>
          <p style={{ marginTop: "10px", fontSize: "14px", lineHeight: 1.6, color: "#94a3b8" }}>
            Terjadi kesalahan yang tidak dapat dipulihkan. Muat ulang halaman; bila tetap gagal, hubungi admin.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: "14px",
                padding: "8px 12px",
                borderRadius: "10px",
                background: "#1e293b",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "12px",
                color: "#cbd5e1",
              }}
            >
              Kode: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "18px",
              padding: "10px 18px",
              borderRadius: "12px",
              border: "none",
              background: "#00A876",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}
