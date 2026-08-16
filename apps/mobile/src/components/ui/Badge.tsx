import { Text } from "tamagui";

type Tone = "accent" | "success" | "warning" | "danger" | "muted" | "purple" | "info";

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  accent: { bg: "$accentSoft", fg: "$accent" },
  success: { bg: "$successSoft", fg: "$success" },
  warning: { bg: "$warningSoft", fg: "$warning" },
  danger: { bg: "$dangerSoft", fg: "$danger" },
  muted: { bg: "$bg", fg: "$muted" },
  purple: { bg: "$purpleSoft", fg: "$purple" },
  info: { bg: "$teal", fg: "$fg" },
};

export function Badge({ label, tone = "muted", size = "sm" }: { label: string; tone?: Tone; size?: "sm" | "md" }) {
  const s = TONE_STYLES[tone];
  return (
    <Text
      backgroundColor={s.bg}
      color={s.fg}
      fontSize={size === "sm" ? 11 : 13}
      fontWeight="700"
      paddingHorizontal={size === "sm" ? 8 : 10}
      paddingVertical={size === "sm" ? 3 : 5}
      borderRadius={9999}
      overflow="hidden"
    >
      {label}
    </Text>
  );
}

// Status → tone mapping for laporan/inspection
export function StatusBadge({ status }: { status: string }) {
  const s = String(status || "").toUpperCase();
  const tone: Tone =
    s === "APPROVED" || s === "SELESAI"
      ? "success"
      : s === "REJECTED"
        ? "danger"
        : s === "SUBMITTED" || s === "TERJADWAL"
          ? "accent"
          : s === "DRAFT"
            ? "muted"
            : s === "DILEWATI"
              ? "warning"
              : "muted";
  const label =
    s === "APPROVED"
      ? "Disetujui"
      : s === "SUBMITTED"
        ? "Diajukan"
        : s === "REJECTED"
          ? "Ditolak"
          : s === "SELESAI"
            ? "Selesai"
            : s === "TERJADWAL"
              ? "Terjadwal"
              : s === "DILEWATI"
                ? "Dilewati"
                : s === "DRAFT"
                  ? "Draft"
                  : s;
  return <Badge label={label} tone={tone} />;
}
