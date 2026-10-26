import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: string;
    puskesmasId: number | null;
    puskesmasNama?: string;
    mustChangePassword?: boolean;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
      puskesmasId: number | null;
      puskesmasNama?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    puskesmasId: number | null;
    puskesmasNama?: string;
    /** Wajib ganti password sebelum memakai aplikasi (akun hasil seed). */
    mustChangePassword?: boolean;
    /** Sesi dicabut karena user sudah tidak ada. */
    disabled?: boolean;
    /** Cap waktu revalidasi role terakhir. */
    checkedAt?: number;
  }
}
