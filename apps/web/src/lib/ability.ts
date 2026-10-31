import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";

export type Action = "manage" | "create" | "read" | "update" | "delete" | "approve" | "export";

export type Subject =
  | "all"
  | "DashboardOverview"
  | "DashboardPkm"
  | "Laporan"
  | "Rekap"
  | "Perbandingan"
  | "Pemeriksaan"
  | "FormPemeriksaan"
  | "DataDasar"
  | "RencanaBulanan"
  | "RencanaTahunan"
  | "Approval"
  | "LaporanBuilder"
  | "AuditLog"
  | "FileManager"
  | "Settings"
  | "User";

export type AppAbility = MongoAbility<[Action, Subject]>;

export interface AbilityUser {
  role: string;
  puskesmasId?: number | null;
}

export function defineAbilityFor(user?: AbilityUser | null): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (!user) {
    // Unauthenticated user
    return build();
  }

  const role = user.role?.toUpperCase();

  if (role === "ADMIN") {
    can("manage", "all");
  } else if (role === "DINKES") {
    can("read", "all");
    can(["read", "approve", "export"], "Laporan");
    can(["read", "approve", "export"], "Pemeriksaan");
    can("read", "Approval");
    can(["create", "update"], "LaporanBuilder");
    can("read", "DashboardOverview");
    cannot("read", "DashboardPkm");
    cannot("manage", ["User", "AuditLog", "Settings", "FileManager"]);
  } else if (role === "OPERATOR") {
    can("read", "DashboardPkm");
    cannot("read", "DashboardOverview");
    can(
      ["create", "read", "update"],
      ["Pemeriksaan", "DataDasar", "FormPemeriksaan", "RencanaBulanan", "RencanaTahunan"],
    );
    can(["read", "export"], "Laporan");
    cannot("approve", "all");
    cannot("manage", ["User", "AuditLog", "Settings", "FileManager", "Approval", "LaporanBuilder"]);
  }

  return build();
}
