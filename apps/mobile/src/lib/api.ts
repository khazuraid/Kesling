import type {
  ApiUser,
  Category,
  Dashboard,
  InspectionDetail,
  InspectionResultsPage,
  LaporanDetail,
  LaporanItem,
  Notifications,
  Rekap,
  RencanaBulanan,
  RencanaTahunan,
  Sasaran,
  Template,
  TemplateDetail,
} from "../types";
import { deleteToken, getToken } from "./storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

export type { ApiUser };

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// In-memory token cache — avoids async SecureStore race on fresh login
let memToken: string | null = null;

export function setMemToken(t: string | null) {
  memToken = t;
}

export async function getActiveToken(): Promise<string | null> {
  if (memToken) return memToken;
  const t = await getToken();
  if (t) memToken = t;
  return t;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getActiveToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api/mobile/v1${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    memToken = null;
    await deleteToken();
    throw new ApiError("Sesi tidak valid atau telah berakhir.", 401);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error || `HTTP ${res.status}`, res.status);
  }
  return data as T;
}

export const api = {
  login: async (email: string, password: string) => {
    const data = await request<{ success?: boolean; token: string; user: ApiUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    // cache token in-memory immediately
    setMemToken(data.token);
    return { token: data.token, user: data.user };
  },

  me: () => request<ApiUser>("/me"),

  dashboard: (puskesmasId?: number | null) =>
    request<Dashboard>(`/dashboard${puskesmasId ? `?puskesmasId=${puskesmasId}` : ""}`),

  puskesmasList: () => request<Array<{ id: number; nama: string }>>("/puskesmas"),

  sasaran: (subCategoryId?: number) =>
    request<Sasaran[]>(`/sasaran${subCategoryId ? `?subCategoryId=${subCategoryId}` : ""}`),

  createSasaran: (body: {
    nama: string;
    alamat?: string;
    pemilik?: string;
    kontak?: string;
    subCategoryId: number;
    lat?: number | null;
    lng?: number | null;
  }) => request<Sasaran>("/sasaran", { method: "POST", body: JSON.stringify(body) }),

  updateSasaran: (
    id: number,
    body: {
      nama: string;
      alamat?: string;
      pemilik?: string;
      kontak?: string;
      subCategoryId?: number;
      lat?: number | null;
      lng?: number | null;
    },
  ) =>
    request<{ id: number }>(`/sasaran/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteSasaran: (id: number) => request<{ success: boolean }>(`/sasaran/${id}`, { method: "DELETE" }),

  templates: () => request<Template[]>("/inspection/templates"),

  templateDetail: (id: number) => request<TemplateDetail>(`/inspection/templates/${id}`),

  updateTemplate: (id: number, body: Record<string, unknown>) =>
    request<{ id: number }>(`/inspection/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteTemplate: (id: number) => request<{ success: boolean }>(`/inspection/templates/${id}`, { method: "DELETE" }),

  inspectionResults: (page = 1, pageSize = 20) =>
    request<InspectionResultsPage>(`/inspection/results?page=${page}&pageSize=${pageSize}`),

  inspectionDetail: (id: number) => request<InspectionDetail>(`/inspection/results/${id}`),

  deleteInspection: (id: number) => request<{ success: boolean }>(`/inspection/results/${id}`, { method: "DELETE" }),

  offlineSync: (body: Record<string, unknown>) =>
    request<{ id: number; status: string; syncedAt: string; duplicate?: boolean }>("/inspection/offline-sync", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  categories: () => request<Category[]>("/laporan/categories"),

  laporanList: (bulan: number, tahun: number) =>
    request<LaporanItem[]>("/laporan/categories", {
      method: "POST",
      body: JSON.stringify({ bulan, tahun }),
    }),

  createLaporan: (bulan: number, tahun: number) =>
    request<{ success: boolean; count: number }>("/laporan/create", {
      method: "POST",
      body: JSON.stringify({ bulan, tahun }),
    }),

  laporanDetail: (id: number) => request<LaporanDetail>(`/laporan/${id}`),

  saveLaporan: (
    id: number,
    body: {
      values: Array<{ parameterId: number; subCategoryId: number | null; value: string }>;
      catatan?: string;
      status?: string;
    },
  ) =>
    request<{ success: boolean }>(`/laporan/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  // Rencana Bulanan
  rencanaBulanan: (bulan: number, tahun: number, puskesmasId?: number | null) =>
    request<RencanaBulanan>(
      `/rencana-bulanan?bulan=${bulan}&tahun=${tahun}${puskesmasId ? `&puskesmasId=${puskesmasId}` : ""}`,
    ),

  generateRencana: (bulan: number, tahun: number, kapasitasPerHari?: number) =>
    request<{ success: boolean; count: number; bulan: number; tahun: number }>(`/rencana-bulanan/generate`, {
      method: "POST",
      body: JSON.stringify({ bulan, tahun, kapasitasPerHari }),
    }),

  // Rencana Tahunan
  rencanaTahunan: (tahun: number) => request<RencanaTahunan>(`/rencana-tahunan?tahun=${tahun}`),

  // Rekap
  rekap: (tahun: number, puskesmasId?: number | null) =>
    request<Rekap>(`/rekap?tahun=${tahun}${puskesmasId ? `&puskesmasId=${puskesmasId}` : ""}`),

  // Notifications
  notifications: (unread?: boolean) => request<Notifications>(`/notifications${unread ? "?unread=true" : ""}`),

  markNotifRead: (id?: number, markAll?: boolean) =>
    request<{ success: boolean }>(`/notifications`, {
      method: "PUT",
      body: JSON.stringify({ id, markAll }),
    }),
};
