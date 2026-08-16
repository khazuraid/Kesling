// Shared API types — single source of truth for mobile data contracts

export type Role = "ADMIN" | "DINKES" | "OPERATOR" | "PETUGAS";

export type ApiUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  puskesmasId: number | null;
  puskesmasNama: string | null;
};

export type Dashboard = {
  templateCount: number;
  sasaranCount: number;
  userInspectionsCount: number;
  recentInspections: Array<{
    id: number;
    namaSasaran: string;
    alamatSasaran: string;
    status: string;
    tanggal: string;
    templateName: string;
  }>;
};

export type Sasaran = {
  id: number;
  nama: string;
  alamat: string;
  pemilik: string;
  kontak: string;
  lat: number | null;
  lng: number | null;
  subCategoryId: number | null;
};

export type Template = {
  id: number;
  nama: string;
  deskripsi: string | null;
  scope: string;
  subCategoryId: number | null;
  subCategoryName: string | null;
  requiredFieldCount: number;
  updatedAt: string;
};

export type TemplateField = {
  id: number;
  pertanyaan: string;
  tipe: string;
  isRequired: boolean;
  urutan: number;
  grup: string | null;
  options: string | null;
};

export type TemplateDetail = {
  id: number;
  nama: string;
  deskripsi: string | null;
  fields: TemplateField[];
};

export type InspectionResult = {
  id: number;
  namaSasaran: string;
  alamatSasaran: string;
  status: string;
  tanggal: string;
  templateName: string;
};

export type InspectionResultsPage = {
  total: number;
  page: number;
  pageSize: number;
  results: InspectionResult[];
};

export type InspectionDetail = {
  id: number;
  namaSasaran: string | null;
  alamatSasaran: string | null;
  status: string;
  catatan: string | null;
  lat: number | null;
  lng: number | null;
  tanggal: string;
  templateName: string;
  values: Array<{ pertanyaan: string; tipe: string; value: string | number | null }>;
};

export type Category = {
  id: number;
  nama: string;
  urutan: number;
  subCategories: Array<{ id: number; nama: string; urutan: number }>;
};

export type LaporanItem = {
  id: number;
  categoryId: number;
  categoryName: string;
  status: string;
  catatan: string | null;
  updatedAt: string;
};

export type LaporanDetail = {
  id: number;
  categoryName: string;
  categoryCode: string;
  isRowBased: boolean;
  bulan: number;
  tahun: number;
  status: string;
  catatan: string | null;
  parameters: Array<{
    id: number;
    nama: string;
    code: string;
    type: string;
    required: boolean;
    urutan: number;
    config: any;
  }>;
  subCategories: Array<{ id: number; nama: string; grup: string | null; urutan: number }>;
  values: Array<{ id: number; parameterId: number; subCategoryId: number | null; value: string }>;
};

export type RencanaBulanan = {
  bulan: number;
  tahun: number;
  bulanNama: string;
  totalSasaran: number;
  totalSelesai: number;
  totalTerjadwal: number;
  progress: number;
  kategori: Array<{
    kategoriId: number;
    kategoriNama: string;
    kategoriIcon: string;
    subKategori: {
      id: number;
      nama: string;
      sasaran: Array<{
        id: number;
        nama: string;
        alamat: string | null;
        rencanaId: number | null;
        tanggalRencana: string | null;
        status: string;
        prioritas: number;
        sudahDiperiksa: boolean;
        tanggalPeriksa: string | null;
      }>;
    };
  }>;
};

export type RencanaTahunan = {
  tahun: number;
  totalSasaran: number;
  totalSelesai: number;
  totalTarget: number;
  progressTahunan: number;
  months: Array<{
    bulan: number;
    nama: string;
    totalSasaran: number;
    terjadwal: number;
    selesai: number;
    dilewati: number;
    belum: number;
    progress: number;
  }>;
  triwulan: Array<{ label: string; selesai: number; target: number; progress: number }>;
  semester: Array<{ label: string; selesai: number; target: number; progress: number }>;
};

export type Rekap = {
  tahun: number;
  overallPct: number;
  overallLabel: string;
  triwulanLabels: string[];
  semesterLabels: string[];
  bulanLabels: string[];
  categories: Array<{
    id: number;
    nama: string;
    icon: string;
    pctMonthly: number[];
    triwulan: number[];
    semester: number[];
    pctTahunan: number;
  }>;
};

export type LiburInfo = {
  tanggal: string;
  keterangan: string;
  sumber: "nasional" | "custom" | "minggu";
  hari: string;
};

export type Notifications = {
  notifications: Array<{ id: number; title: string; message: string; isRead: boolean; createdAt: string }>;
  unreadCount: number;
  liburMendatang: LiburInfo[];
};
