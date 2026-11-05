"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, ExternalLink, Heart, Loader2, QrCode, Sparkles } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const PRESET_AMOUNTS = [10_000, 25_000, 50_000, 100_000];

export function DonationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(25_000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);

  // Status tagihan aktif
  const [activeDonation, setActiveDonation] = useState<{
    orderId: string;
    amount: number;
    paymentUrl?: string | null;
    qrCodeUrl?: string | null;
  } | null>(null);

  // Listener event global untuk trigger manual (dari sidebar / header)
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setActiveDonation(null);
    };
    document.addEventListener("kesling:open-donation", handleOpen);
    return () => document.removeEventListener("kesling:open-donation", handleOpen);
  }, []);

  // Cek return URL callback dari SumoPod (?donation=success atau ?donation=cancel)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const donationStatus = params.get("donation");
      if (donationStatus === "success") {
        toast.success(
          "Alhamdulillah! Pembayaran donasi Anda telah berhasil terverifikasi. Terima kasih banyak atas dukungan Anda!",
          { duration: 8000 },
        );
        window.history.replaceState({}, "", window.location.pathname);
      } else if (donationStatus === "cancel") {
        toast.info("Pembayaran donasi dibatalkan atau belum diselesaikan.");
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {}
  }, []);

  // Auto popup berkala jika diaktifkan (maksimal 1 kali per 3 hari jika belum donasi)
  useEffect(() => {
    try {
      const lastDismiss = localStorage.getItem("kesling:donation-popup-dismiss");
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (!lastDismiss || Date.now() - Number(lastDismiss) > threeDaysMs) {
        // Tunda 2.5 detik agar pengguna tidak langsung terkejut saat pertama load
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  // Mutation create payment
  const createMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch("/api/donations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat tagihan donasi");
      return data.donation;
    },
    onSuccess: (donation) => {
      setActiveDonation(donation);
      toast.success("QRIS Donasi berhasil dibuat.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal membuat tagihan donasi");
    },
  });

  // Polling cek status pembayaran jika activeDonation ada
  const { data: statusData } = useQuery({
    queryKey: ["donation-status", activeDonation?.orderId],
    queryFn: async () => {
      if (!activeDonation?.orderId) return null;
      const res = await fetch(`/api/donations/${activeDonation.orderId}/status`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: Boolean(activeDonation?.orderId),
    refetchInterval: 3000, // Cek tiap 3 detik
  });

  const isPaid = statusData?.donation?.status === "PAID";

  const handleClose = () => {
    setIsOpen(false);
    setActiveDonation(null);
    try {
      localStorage.setItem("kesling:donation-popup-dismiss", String(Date.now()));
    } catch {}
  };

  const handleProceed = () => {
    const finalAmount = isCustom ? Number(customAmount) : selectedAmount;
    if (!finalAmount || finalAmount < 1000) {
      toast.error("Nominal donasi minimal Rp 1.000");
      return;
    }
    createMutation.mutate(finalAmount);
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={isPaid ? "Terima Kasih Banyak!" : "Dukung Pengembangan Kesling"}
      description={
        isPaid
          ? "Donasi Anda telah terverifikasi secara instan via SumoPod QRIS."
          : "Donasi sukarela Anda membantu biaya operasional server dan pemeliharaan sistem kesehatan lingkungan."
      }
      icon={
        <Heart className={`w-5 h-5 ${isPaid ? "text-emerald-500 fill-emerald-500" : "text-rose-500 fill-rose-500"}`} />
      }
      size="md"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-xs text-muted-foreground"
          >
            {isPaid ? "Tutup" : "Nanti Saja"}
          </Button>

          {!isPaid && !activeDonation && (
            <Button
              type="button"
              size="sm"
              onClick={handleProceed}
              disabled={createMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold shadow-xs text-xs px-5 gap-1.5"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyiapkan QRIS...
                </>
              ) : (
                <>
                  <QrCode className="w-3.5 h-3.5" /> Lanjut ke QRIS
                </>
              )}
            </Button>
          )}

          {activeDonation && !isPaid && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveDonation(null)}
                className="text-xs"
              >
                Ubah Nominal
              </Button>
              {activeDonation.paymentUrl && (
                <Button
                  asChild
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold shadow-xs text-xs px-4 gap-1.5"
                >
                  <a href={activeDonation.paymentUrl} target="_blank" rel="noreferrer">
                    Buka Halaman Bayar <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      }
    >
      <div className="p-6 space-y-5">
        {isPaid ? (
          /* Tampilan Sukses */
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Pembayaran Berhasil!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Terima kasih atas kontribusi tulus Anda sebesar{" "}
                <span className="font-bold text-foreground font-mono">
                  Rp {(activeDonation?.amount || 0).toLocaleString("id-ID")}
                </span>
                . Dukungan Anda sangat berarti bagi kelancaran operasional faskes dan sanitasi kota.
              </p>
            </div>
          </div>
        ) : activeDonation ? (
          /* Tampilan QRIS Menunggu Pembayaran */
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle border border-border">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Donasi</p>
                <p className="text-base font-black font-mono text-foreground mt-0.5">
                  Rp {activeDonation.amount.toLocaleString("id-ID")}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 gap-1.5 py-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Menunggu Pembayaran
              </Badge>
            </div>

            {/* Area QRIS */}
            <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-xs">
              {activeDonation.qrCodeUrl ? (
                <Image
                  src={activeDonation.qrCodeUrl}
                  alt="QRIS Donasi SumoPod"
                  width={224}
                  height={224}
                  unoptimized
                  className="w-56 h-56 object-contain rounded-lg border border-border/40"
                />
              ) : (
                <div className="w-56 h-56 flex flex-col items-center justify-center text-center p-4 bg-surface-subtle border border-dashed border-border rounded-lg">
                  <QrCode className="w-12 h-12 text-muted-foreground/60 mb-2" />
                  <p className="text-xs text-muted-foreground font-medium">
                    Silakan klik tombol &quot;Buka Halaman Bayar&quot; di bawah untuk scan QRIS.
                  </p>
                </div>
              )}

              <p className="text-[11px] font-semibold text-muted-foreground mt-3 text-center">
                Scan kode QRIS di atas menggunakan GoPay, OVO, Dana, BCA, ShopeePay, atau Mobile Banking apa saja.
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>
                Order ID: <code className="font-mono">{activeDonation.orderId}</code>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeDonation.orderId);
                  toast.success("Order ID disalin ke clipboard");
                }}
                className="hover:text-foreground flex items-center gap-1 font-medium"
              >
                <Copy className="w-3 h-3" /> Salin
              </button>
            </div>
          </div>
        ) : (
          /* Pemilihan Nominal Donasi */
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                <span>Dukungan Komunitas Sanitarian</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                Sistem Kesling dikembangkan untuk mendigitalisasi pelaporan dan inspeksi sanitasi puskesmas. Donasi ini
                mendukung biaya server, database, dan pembaruan fitur.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Pilih Nominal Donasi
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((amt) => {
                  const isSelected = !isCustom && selectedAmount === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amt);
                        setIsCustom(false);
                      }}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSelected
                          ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-black shadow-xs ring-1 ring-rose-500"
                          : "border-border bg-surface hover:bg-surface-subtle text-foreground font-bold"
                      }`}
                    >
                      <span className="text-xs font-mono">Rp {amt.toLocaleString("id-ID")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nominal Kustom */}
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsCustom(!isCustom)}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                {isCustom ? "← Gunakan nominal rekomendasi" : "+ Masukkan nominal kustom lainnya"}
              </button>

              {isCustom && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-bold text-muted-foreground font-mono">Rp</span>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    placeholder="Contoh: 75000"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-border bg-surface px-3 py-1 text-xs font-mono font-bold shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
