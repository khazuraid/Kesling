import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: Number(session.user.id),
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as "ADMIN" | "OPERATOR" | "DINKES",
    puskesmasId: session.user.puskesmasId,
  };
}

export function isAdmin(user: { role: string } | null) {
  return user?.role === "ADMIN";
}
