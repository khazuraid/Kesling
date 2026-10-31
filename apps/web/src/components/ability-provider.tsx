"use client";

import { AbilityProvider as CaslAbilityProvider, Can as CaslCan, useAbility as useCaslAbility } from "@casl/react";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { type AppAbility, defineAbilityFor } from "@/lib/ability";

export function AbilityProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  const ability = useMemo(() => {
    return defineAbilityFor(session?.user);
  }, [session?.user?.role, session?.user?.puskesmasId]);

  return <CaslAbilityProvider value={ability}>{children}</CaslAbilityProvider>;
}

export const Can = CaslCan;

export function useAppAbility(): AppAbility {
  return useCaslAbility() as AppAbility;
}
