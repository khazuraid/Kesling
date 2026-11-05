"use client";

import { CheckCircle2, Copy, ExternalLink, Heart, Loader2, MapPin, QrCode, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PRESET_AMOUNTS = [10_000, 25_000, 50_000, 100_000];

interface PublicInteractiveProps {
  puskesmasList: { id: number; nama: string }[];
}

export function PublicInteractiveSection({ puskesmasList }: PublicInteractiveProps) {
  // Search puskesmas state
  const [pkmSearch, setPkmSearch] = useState("");

  // Donasi state
  const [selectedAmount, setSelectedAmount] = useState<number>(25_000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [activeDonation, setActiveDonation] = useState<{
    orderId: string;
    amount: number;
    paymentUrl?: string | null;
    qrCodeUrl?: string | null;
  } | null>(null);

  const filteredPuskesmas = useMemo(() => {
    const q = pkmSearch.toLowerCase().trim();
    if (!q) return puskesmasList;
    return puskesmasList.filter((p) => p.nama.toLowerCase().includes(q));
  }, [puskesmasList, pkmSearch]);

  const effectiveAmount = isCustom ? Number(customAmount) || 0 : selectedAmount;

  async function handleCreateDonation() {
    if (effectiveAmount < 1000) {
      toast.error("Nominal donasi minimal Rp 1.000");
      return;
    }

    setIsLoadingPayment(true);
    try {
      const res = await fetch("/api/donations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: effectiveAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses donasi");
      setActiveDonation(data.donation);
      toast.success("Kode QRIS berhasil dibuat!");
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses donasi");
    } finally {
      setIsLoadingPayment(false);
    }
  }

  function handleCopy(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success("ID pesanan berhasil disalin");
    }
  }

  return (
    <>
      {/* ── 1. WILAYAH KERJA PUSKESMAS INTERAKTIF ── */}
      <section
        id="wilayah"
        tabIndex={-1}
        className="py-16 sm:py-20 border-b border-border/80 bg-surface/40 scroll-mt-20 focus:outline-none"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Cakupan Faskes Kota</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                Jejaring 22 wilayah kerja Puskesmas.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Seluruh kelurahan di Kota Cirebon terhubung secara terpusat untuk pemantauan kualitas sanitasi dan
                keamanan lingkungan masyarakat.
              </p>
            </div>

            <div className="w-full sm:w-80">
              <label htmlFor="pkm-search-input" className="sr-only">
                Cari nama Puskesmas
              </label>
              <div className="relative">
                <Search
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  id="pkm-search-input"
                  type="search"
                  placeholder="Cari Puskesmas (cth: Kesambi)..."
                  value={pkmSearch}
                  onChange={(e) => setPkmSearch(e.target.value)}
                  className="pl-10 h-11 text-sm rounded-xl bg-surface border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                />
              </div>
            </div>
          </div>

          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
            role="list"
            aria-label="Daftar Puskesmas Kota Cirebon"
          >
            {filteredPuskesmas.map((pkm, idx) => (
              <div
                key={pkm.id || pkm.nama}
                role="listitem"
                className="min-h-[52px] p-3 rounded-xl border border-border bg-surface hover:border-primary/50 hover:shadow-subtle transition-all flex items-center gap-2.5 group"
              >
                <div
                  className="w-7 h-7 rounded-lg bg-surface-subtle text-muted-foreground group-hover:bg-primary-subtle group-hover:text-primary transition-colors flex items-center justify-center shrink-0 text-xs font-bold tabular-nums"
                  aria-hidden="true"
                >
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-foreground block truncate group-hover:text-primary transition-colors">
                    {pkm.nama}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-semibold block truncate">Kota Cirebon</span>
                </div>
              </div>
            ))}
          </div>

          {filteredPuskesmas.length === 0 && (
            <div className="text-center py-12 rounded-xl border border-dashed border-border bg-surface-subtle/50 text-sm text-muted-foreground">
              Tidak ada puskesmas yang cocok dengan kata kunci &quot;{pkmSearch}&quot;.
            </div>
          )}
        </div>
      </section>

      {/* ── 2. DUKUNGAN SANITASI & DONASI QRIS ── */}
      <section
        id="donasi"
        tabIndex={-1}
        className="py-16 sm:py-20 border-b border-border/80 bg-canvas scroll-mt-20 focus:outline-none"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-primary/20 bg-surface p-6 sm:p-10 shadow-subtle">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Kolom Informasi & Form */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
                  <Heart className="w-3.5 h-3.5 text-primary fill-primary" aria-hidden="true" />
                  <span>Dukungan Operasional Sanitasi</span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                  Bantu akselerasi digitalisasi sanitasi Kota Cirebon.
                </h2>

                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Infaq dan donasi Anda dimanfaatkan langsung untuk biaya server pelaporan, lisensi AI parsing audit,
                  serta pengembangan fitur pelaporan lapangan sanitarian secara transparan.
                </p>

                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Pilih Nominal Donasi:
                  </span>
                  <div
                    className="flex flex-wrap items-center gap-2.5"
                    role="radiogroup"
                    aria-label="Pilihan nominal donasi"
                  >
                    {PRESET_AMOUNTS.map((amt) => {
                      const isSelected = !isCustom && selectedAmount === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => {
                            setIsCustom(false);
                            setSelectedAmount(amt);
                          }}
                          className={`min-h-[44px] px-5 rounded-full text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                            isSelected
                              ? "bg-primary text-white shadow-xs"
                              : "bg-surface border border-border text-foreground hover:border-primary/40 hover:bg-surface-subtle"
                          }`}
                        >
                          Rp {amt.toLocaleString("id-ID")}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isCustom}
                      onClick={() => setIsCustom(true)}
                      className={`min-h-[44px] px-5 rounded-full text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        isCustom
                          ? "bg-primary text-white shadow-xs"
                          : "bg-surface border border-border text-foreground hover:border-primary/40 hover:bg-surface-subtle"
                      }`}
                    >
                      Nominal Lain
                    </button>
                  </div>

                  {isCustom && (
                    <div className="pt-2 max-w-xs space-y-1">
                      <label htmlFor="custom-donation-input" className="text-xs font-semibold text-muted-foreground">
                        Masukkan Nominal (Min. Rp 1.000)
                      </label>
                      <Input
                        id="custom-donation-input"
                        type="number"
                        min="1000"
                        step="1000"
                        placeholder="Contoh: 75000"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="h-11 text-sm font-bold bg-surface focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleCreateDonation}
                    disabled={isLoadingPayment}
                    className="min-h-[44px] px-7 rounded-full font-bold shadow-xs gap-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {isLoadingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Membuat QRIS...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4" aria-hidden="true" />
                        <span>Donasi Sekarang (Rp {effectiveAmount.toLocaleString("id-ID")})</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Kolom Visual QRIS / Hasil */}
              <div className="lg:col-span-5 flex justify-center">
                {activeDonation ? (
                  <Card className="p-6 bg-surface border-primary/30 shadow-float max-w-sm w-full space-y-4 text-center">
                    <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                      <span className="text-xs font-semibold text-muted-foreground truncate">
                        ID: {activeDonation.orderId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeDonation.orderId)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
                        aria-label="Salin ID Pesanan"
                      >
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Salin</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-semibold">Total Pembayaran</p>
                      <p className="text-2xl font-extrabold text-foreground tabular-nums">
                        Rp {activeDonation.amount.toLocaleString("id-ID")}
                      </p>
                    </div>

                    {activeDonation.qrCodeUrl ? (
                      <div className="p-3 bg-white rounded-xl border border-border inline-block shadow-subtle mx-auto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeDonation.qrCodeUrl}
                          alt={`QRIS Donasi Sanitasi Cirebon Rp ${activeDonation.amount.toLocaleString("id-ID")}`}
                          width={224}
                          height={224}
                          className="w-56 h-56 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-56 h-56 bg-surface-subtle border border-dashed border-border rounded-xl flex items-center justify-center mx-auto text-xs text-muted-foreground">
                        Memuat QRIS...
                      </div>
                    )}

                    <div className="space-y-2 pt-2">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Scan dengan aplikasi m-Banking (BCA, Mandiri, BRI, BNI) atau e-Wallet (Gopay, OVO, Dana,
                        ShopeePay).
                      </p>

                      {activeDonation.paymentUrl && (
                        <Button asChild variant="outline" size="sm" className="w-full text-xs font-bold gap-1.5 h-10">
                          <a href={activeDonation.paymentUrl} target="_blank" rel="noopener noreferrer">
                            <span>Buka Halaman Checkout</span>
                            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </Card>
                ) : (
                  <div className="p-8 border border-border rounded-2xl bg-surface text-center space-y-4 max-w-sm w-full shadow-2xs">
                    <div className="w-16 h-16 rounded-2xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center mx-auto shadow-2xs">
                      <QrCode className="w-8 h-8" aria-hidden="true" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-extrabold text-foreground">Dukungan Instan QRIS</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Pilih nominal dan tekan tombol donasi untuk memunculkan kode QRIS resmi Dinas Kesehatan.
                      </p>
                    </div>
                    <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                      <span>Verifikasi Otomatis Realtime</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
