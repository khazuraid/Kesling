"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, AlertTriangle, CheckCircle2, Megaphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface PopupAnnouncement {
  id: number;
  title: string;
  content: string;
  imageUrl?: string | null;
  type: "INFO" | "WARNING" | "URGENT";
  createdAt: string;
}

export function AnnouncementModal() {
  const queryClient = useQueryClient();
  const [closedTemporarily, setClosedTemporarily] = useState(false);

  const { data } = useQuery<{ announcement: PopupAnnouncement | null }>({
    queryKey: ["announcement-popup"],
    queryFn: async () => {
      const res = await fetch("/api/announcements/popup");
      if (!res.ok) return { announcement: null };
      return res.json();
    },
    staleTime: 60_000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/announcements/${id}/dismiss`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Gagal mengonfirmasi pengumuman");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcement-popup"] });
      toast.success("Pengumuman telah dikonfirmasi.");
    },
    onError: () => {
      toast.error("Gagal menyimpan konfirmasi pengumuman.");
    },
  });

  const announcement = data?.announcement;
  const isOpen = Boolean(announcement && !closedTemporarily);

  if (!announcement) return null;

  const typeConfig = {
    URGENT: {
      badge: "PENTING & MENDESAK",
      badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
      iconClass: "text-destructive bg-destructive/10 border-destructive/20",
      Icon: AlertOctagon,
      buttonVariant: "destructive" as const,
    },
    WARNING: {
      badge: "PERHATIAN",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      iconClass: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      Icon: AlertTriangle,
      buttonVariant: "default" as const,
    },
    INFO: {
      badge: "PENGUMUMAN",
      badgeClass: "bg-primary-subtle text-primary border-primary/20",
      iconClass: "text-primary bg-primary-subtle border-primary/20",
      Icon: Megaphone,
      buttonVariant: "default" as const,
    },
  }[announcement.type] || {
    badge: "PENGUMUMAN",
    badgeClass: "bg-primary-subtle text-primary border-primary/20",
    iconClass: "text-primary bg-primary-subtle border-primary/20",
    Icon: Megaphone,
    buttonVariant: "default" as const,
  };

  const { Icon } = typeConfig;

  const handleDismiss = () => {
    dismissMutation.mutate(announcement.id);
  };

  return (
    <Modal
      open={isOpen}
      onClose={() => setClosedTemporarily(true)}
      title={announcement.title}
      size="md"
      variant="hero"
      icon={<Icon className="w-5 h-5" />}
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setClosedTemporarily(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Nanti Saja
          </Button>

          <Button
            type="button"
            variant={typeConfig.buttonVariant}
            size="sm"
            disabled={dismissMutation.isPending}
            onClick={handleDismiss}
            className="gap-1.5 font-bold shadow-xs text-xs px-4"
          >
            <CheckCircle2 className="w-4 h-4" />
            Saya Mengerti
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${typeConfig.badgeClass}`}
          >
            {typeConfig.badge}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">
            {new Date(announcement.createdAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        {announcement.imageUrl && (
          <div className="relative w-full rounded-xl overflow-hidden border border-border/80 bg-surface-subtle max-h-64 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={announcement.imageUrl}
              alt={announcement.title}
              className="w-full h-auto max-h-64 object-contain rounded-lg"
              loading="lazy"
            />
          </div>
        )}

        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line bg-surface-subtle/50 p-4 rounded-xl border border-border/60 max-h-[50vh] overflow-y-auto">
          {announcement.content}
        </div>
      </div>
    </Modal>
  );
}
