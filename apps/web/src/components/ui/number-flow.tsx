"use client";

import NumberFlowPrimitive, { type Format, type Value } from "@number-flow/react";
import { cn } from "@/lib/utils";

interface NumberFlowProps {
  value: Value;
  locales?: string;
  format?: Format;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function NumberFlow({ value, locales = "id-ID", format, prefix, suffix, className }: NumberFlowProps) {
  return (
    <span className={cn("inline-flex items-baseline font-inherit tabular-nums", className)}>
      {prefix && <span className="mr-0.5">{prefix}</span>}
      <NumberFlowPrimitive value={value} locales={locales} format={format} />
      {suffix && <span className="ml-0.5">{suffix}</span>}
    </span>
  );
}

export default NumberFlow;
