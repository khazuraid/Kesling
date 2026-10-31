import { describe, expect, it } from "vitest";
import { defineAbilityFor } from "@/lib/ability";

describe("defineAbilityFor", () => {
  it("defines correct permissions for ADMIN", () => {
    const ability = defineAbilityFor({ role: "ADMIN" });

    // ADMIN can manage system resources
    expect(ability.can("manage", "all")).toBe(true);
    expect(ability.can("read", "DashboardOverview")).toBe(true);
    expect(ability.can("read", "Approval")).toBe(true);
    expect(ability.can("manage", "AuditLog")).toBe(true);
    expect(ability.can("manage", "FileManager")).toBe(true);
    expect(ability.can("manage", "Settings")).toBe(true);

    // ADMIN does not operate Puskesmas operational forms
    expect(ability.can("read", "DashboardPkm")).toBe(false);
    expect(ability.can("create", "Pemeriksaan")).toBe(false);
    expect(ability.can("read", "Pemeriksaan")).toBe(false);
    expect(ability.can("read", "FormPemeriksaan")).toBe(false);
    expect(ability.can("create", "RencanaBulanan")).toBe(false);
    expect(ability.can("create", "RencanaTahunan")).toBe(false);
  });

  it("defines correct permissions for DINKES", () => {
    const ability = defineAbilityFor({ role: "DINKES" });

    expect(ability.can("read", "DashboardOverview")).toBe(true);
    expect(ability.can("read", "Approval")).toBe(true);
    expect(ability.can("create", "LaporanBuilder")).toBe(true);

    // DINKES cannot manage system admin settings
    expect(ability.can("manage", "Settings")).toBe(false);
    expect(ability.can("manage", "User")).toBe(false);
    expect(ability.can("manage", "FileManager")).toBe(false);
    expect(ability.can("manage", "AuditLog")).toBe(false);

    // DINKES does not operate Puskesmas field forms
    expect(ability.can("read", "DashboardPkm")).toBe(false);
    expect(ability.can("read", "Pemeriksaan")).toBe(false);
  });

  it("defines correct permissions for OPERATOR", () => {
    const ability = defineAbilityFor({ role: "OPERATOR", puskesmasId: 1 });

    expect(ability.can("read", "DashboardPkm")).toBe(true);
    expect(ability.can("read", "DashboardOverview")).toBe(false);

    // OPERATOR can fill field examinations and plans
    expect(ability.can("create", "Pemeriksaan")).toBe(true);
    expect(ability.can("read", "FormPemeriksaan")).toBe(true);
    expect(ability.can("create", "DataDasar")).toBe(true);
    expect(ability.can("create", "RencanaBulanan")).toBe(true);

    // OPERATOR cannot access admin approval, settings, audit-log
    expect(ability.can("approve", "Laporan")).toBe(false);
    expect(ability.can("manage", "Settings")).toBe(false);
    expect(ability.can("manage", "AuditLog")).toBe(false);
    expect(ability.can("manage", "Approval")).toBe(false);
  });
});
