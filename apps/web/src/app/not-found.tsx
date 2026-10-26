import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-7 w-7 text-muted-foreground" />
        </span>

        <p className="text-[44px] font-black leading-none text-muted-foreground/40">404</p>
        <h1 className="mt-2 text-[17px] font-black text-foreground">Halaman Tidak Ditemukan</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Alamat yang Anda buka tidak ada atau sudah dipindahkan. Periksa kembali tautannya.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[12px] font-extrabold text-primary-foreground transition-colors hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
