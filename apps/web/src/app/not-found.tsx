import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-300 mb-2">404</h1>
        <p className="text-slate-500 mb-4">Halaman tidak ditemukan</p>
        <Link href="/" className="text-teal-600 hover:underline">
          ← Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
