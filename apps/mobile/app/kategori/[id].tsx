import { ChevronRight } from "@tamagui/lucide-icons-2";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, XStack, YStack } from "tamagui";
import { CardGroup, ListRow, PageHeader, SectionLabel } from "../../src/components/ui";
import { Screen } from "../../src/components/ui/Screen";
import { EmptyState } from "../../src/components/ui/States";
import { api } from "../../src/lib/api";

export default function KategoriDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catId = Number(id);
  const router = useRouter();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories,
  });
  const cat = categories?.find((c) => c.id === catId);

  return (
    <Screen>
      <PageHeader title={cat?.nama || "Kategori"} subtitle={`${cat?.subCategories.length ?? 0} sub-kategori`} back />

      <SectionLabel>Sub-kategori</SectionLabel>
      {cat?.subCategories?.length ? (
        <CardGroup>
          {cat.subCategories.map((sub, i) => (
            <ListRow
              key={sub.id}
              title={sub.nama}
              onPress={() => router.push(`/sasaran/new?sub=${sub.id}`)}
              last={i === cat.subCategories.length - 1}
            />
          ))}
        </CardGroup>
      ) : (
        <EmptyState title="Tidak ada sub-kategori" />
      )}
      <YStack h="$8" />
    </Screen>
  );
}
