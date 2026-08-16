import { Check, MapPin } from "@tamagui/lucide-icons-2";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../lib/api";
import { ActionSheet } from "./motion/ActionSheet";

const PKM_KEY = "kesling_scope_puskesmas";

export async function getScopePuskesmasId(): Promise<number | null> {
  const AsyncStorage = require("@react-native-async-storage/async-storage").default;
  const v = await AsyncStorage.getItem(PKM_KEY);
  return v ? Number(v) : null;
}

export async function setScopePuskesmasId(id: number | null) {
  const AsyncStorage = require("@react-native-async-storage/async-storage").default;
  if (id) await AsyncStorage.setItem(PKM_KEY, String(id));
  else await AsyncStorage.removeItem(PKM_KEY);
}

/** Selector puskesmas utk ADMIN/DINKES — hanya render jika role sesuai. */
export function PuskesmasPicker({
  open,
  onClose,
  role,
  currentId,
  onPicked,
}: {
  open: boolean;
  onClose: () => void;
  role?: string;
  currentId: number | null;
  onPicked: (id: number | null) => void;
}) {
  const { data } = useQuery({
    queryKey: ["puskesmas-list"],
    queryFn: api.puskesmasList,
    enabled: open && (role === "ADMIN" || role === "DINKES"),
  });

  if (role !== "ADMIN" && role !== "DINKES") return null;

  return (
    <ActionSheet
      open={open}
      onClose={onClose}
      title="Pilih Puskesmas"
      items={[
        {
          icon: <MapPin size={18} color="#8A8580" />,
          label: "Semua / Default",
          onPress: () => {
            onPicked(null);
            onClose();
          },
        },
        ...(data ?? []).map((p) => ({
          icon: (
            <View style={{ width: 18, alignItems: "center" }}>
              {currentId === p.id ? <Check size={16} color="#00A876" /> : null}
            </View>
          ),
          label: p.nama,
          onPress: () => {
            onPicked(p.id);
            onClose();
          },
        })),
      ]}
    />
  );
}
