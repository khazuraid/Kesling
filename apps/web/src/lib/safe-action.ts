import { prisma } from "@apps-kes/database";
import { createSafeActionClient } from "next-safe-action";
import { getCurrentUser } from "@/lib/session";

export const actionClient = createSafeActionClient({
  async handleServerError(e) {
    console.error("Action error:", e.message);
    try {
      const user = await getCurrentUser().catch(() => null);
      await prisma.systemErrorLog.create({
        data: {
          message: e.message || String(e || "Action Error"),
          stack: e.stack || null,
          path: "Server Action",
          userId: user?.id || null,
          userEmail: user?.email || null,
        },
      });
    } catch (err) {
      console.error("Gagal menulis log error server action ke database:", err);
    }
    return e.message || "Terjadi kesalahan server";
  },
});

export const authActionClient = actionClient.use(async ({ next }) => {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return next({ ctx: { user } });
});
