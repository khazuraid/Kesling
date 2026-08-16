import { type ButtonProps, Button as TButton } from "tamagui";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

const VARIANT_STYLES: Record<Variant, { bg?: string; color: string; borderColor?: string; bgPressed?: string }> = {
  primary: { bg: "$accent", color: "$white" },
  secondary: { bg: "$card", color: "$fg", borderColor: "$border" },
  ghost: { bg: "transparent", color: "$fg" },
  danger: { bg: "$danger", color: "$white" },
  success: { bg: "$success", color: "$white" },
};

export function AppButton({
  variant = "primary",
  size = "md",
  label,
  icon,
  ...props
}: Omit<ButtonProps, "children"> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  label: string;
  icon?: React.ReactNode;
}) {
  const s = VARIANT_STYLES[variant];
  const height = size === "sm" ? 40 : size === "md" ? 48 : 56;
  const fontSize = size === "sm" ? 14 : size === "md" ? 15 : 17;
  return (
    <TButton
      height={height}
      borderRadius={12}
      backgroundColor={s.bg}
      borderWidth={s.borderColor ? 1 : 0}
      borderColor={s.borderColor}
      color={s.color}
      fontSize={fontSize}
      fontWeight="700"
      icon={icon}
      pressStyle={{ opacity: 0.85, scale: 0.98 }}
      {...props}
    >
      {label}
    </TButton>
  );
}
