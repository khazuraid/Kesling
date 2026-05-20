import { MasterCrud } from "@/components/master-crud";

export default function JenisTtuPage() {
  return (
    <MasterCrud
      title="Master Jenis TTU"
      apiUrl="/api/master/jenis-ttu"
      hasKategori
      kategoriOptions={[
        { label: "Prioritas", value: "PRIORITAS" },
        { label: "Non-Prioritas", value: "NON_PRIORITAS" },
      ]}
    />
  );
}
