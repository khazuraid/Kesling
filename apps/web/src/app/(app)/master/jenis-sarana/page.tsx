import { MasterCrud } from "@/components/master-crud";

export default function JenisSaranaPage() {
  return (
    <MasterCrud
      title="Master Jenis Sarana"
      apiUrl="/api/master/jenis-sarana"
      hasKategori
      kategoriOptions={[
        { label: "SPAL", value: "SPAL" },
        { label: "SAB", value: "SAB" },
        { label: "Jamban", value: "JAMBAN" },
      ]}
    />
  );
}
