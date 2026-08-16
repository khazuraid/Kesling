import { ChevronDown } from "@tamagui/lucide-icons-2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert } from "react-native";
import { Input, Text, XStack, YStack } from "tamagui";
import { PageHeader } from "../../src/components/ui";
import { AppButton } from "../../src/components/ui/Button";
import { Screen } from "../../src/components/ui/Screen";
import { api } from "../../src/lib/api";

export default function EditSasaranScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const sasaranId = Number(id);

  const { data: sasaran } = useQuery({
    queryKey: ["sasaran-detail", sasaranId],
    queryFn: async () => {
      const all = await api.sasaran();
      return all.find((s) => s.id === sasaranId);
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories,
  });

  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [pemilik, setPemilik] = useState("");
  const [kontak, setKontak] = useState("");
  const [subCategoryId, setSubCategoryId] = useState<number | null>(null);

  useEffect(() => {
    if (sasaran) {
      setNama(sasaran.nama);
      setAlamat(sasaran.alamat || "");
      setPemilik(sasaran.pemilik || "");
      setKontak(sasaran.kontak || "");
      setSubCategoryId(sasaran.subCategoryId ?? null);
    }
  }, [sasaran]);

  const selected = useMemo(() => {
    if (!categories || !subCategoryId) return null;
    for (const cat of categories) {
      const s = cat.subCategories.find((x) => x.id === subCategoryId);
      if (s) return { category: cat.nama, sub: s.nama };
    }
    return null;
  }, [categories, subCategoryId]);

  const mutation = useMutation({
    mutationFn: () =>
      api.updateSasaran(sasaranId, { nama, alamat, pemilik, kontak, subCategoryId: subCategoryId ?? undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sasaran"] });
      Alert.alert("Berhasil", "Sasaran diperbarui.");
      router.back();
    },
    onError: (e: any) => Alert.alert("Gagal", e.message || "Terjadi kesalahan."),
  });

  const submit = () => {
    if (!nama.trim()) return Alert.alert("Perhatian", "Nama sasaran wajib diisi.");
    mutation.mutate();
  };

  const pickKategori = () => {
    const subs =
      categories?.flatMap((c) => c.subCategories.map((s) => ({ label: `${c.nama} — ${s.nama}`, id: s.id }))) ?? [];
    if (!subs.length) return;
    Alert.alert(
      "Pilih Kategori",
      undefined,
      subs
        .map((s) => ({ text: s.label, onPress: () => setSubCategoryId(s.id) }))
        .concat({ text: "Batal", style: "cancel" }),
    );
  };

  return (
    <Screen>
      <PageHeader title="Edit Sasaran" back />

      <YStack px="$4" gap="$3" mt="$2">
        <FieldInput label="Nama" value={nama} onChange={setNama} placeholder="Nama tempat usaha" />
        <FieldInput label="Alamat" value={alamat} onChange={setAlamat} placeholder="Alamat" />
        <FieldInput label="Pemilik" value={pemilik} onChange={setPemilik} placeholder="Nama pemilik" />
        <FieldInput label="Kontak" value={kontak} onChange={setKontak} placeholder="No HP" />

        <YStack gap="$1.5">
          <Text fontSize="$2.5" color="$muted" fontWeight="700" textTransform="uppercase" letterSpacing={0.5}>
            Kategori
          </Text>
          <XStack
            alignItems="center"
            justifyContent="space-between"
            bg="$card"
            borderWidth={1}
            borderColor={selected ? "$accent" : "$border"}
            borderRadius={12}
            px="$3"
            py="$3"
            onPress={pickKategori}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text fontSize="$4" fontWeight={selected ? "600" : "400"} color={selected ? "$accent" : "$muted"}>
              {selected ? `${selected.category} — ${selected.sub}` : "Pilih kategori"}
            </Text>
            <ChevronDown size={18} color="$muted" />
          </XStack>
        </YStack>

        <AppButton
          label={mutation.isPending ? "Menyimpan..." : "Simpan"}
          onPress={submit}
          disabled={mutation.isPending}
        />
        <YStack h="$8" />
      </YStack>
    </Screen>
  );
}

import { useEffect, useMemo, useState } from "react";

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <YStack gap="$1.5">
      <Text fontSize="$2.5" color="$muted" fontWeight="700" textTransform="uppercase" letterSpacing={0.5}>
        {label}
      </Text>
      <Input
        bg="$card"
        borderRadius={12}
        borderWidth={1}
        borderColor="$border"
        px="$3"
        py="$2.5"
        fontSize="$4"
        color="$fg"
        placeholder={placeholder}
        placeholderTextColor="$muted"
        value={value}
        onChangeText={onChange}
      />
    </YStack>
  );
}
