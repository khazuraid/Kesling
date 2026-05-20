import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: string;
    puskesmasId: number | null;
    puskesmasNama?: string;
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
  }
}
