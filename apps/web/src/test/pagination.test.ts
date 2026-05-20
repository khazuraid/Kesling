import { describe, expect, it } from "vitest";
import { getPaginationParams, paginatedResponse } from "@/lib/pagination";

describe("getPaginationParams", () => {
  it("returns defaults when no params", () => {
    const params = new URLSearchParams();
    const result = getPaginationParams(params);
    expect(result).toEqual({ page: 1, limit: 50, skip: 0 });
  });

  it("handles custom page/limit", () => {
    const params = new URLSearchParams({ page: "3", limit: "20" });
    const result = getPaginationParams(params);
    expect(result).toEqual({ page: 3, limit: 20, skip: 40 });
  });
});

describe("paginatedResponse", () => {
  it("returns correct structure", () => {
    const result = paginatedResponse(["a", "b"], 10, 2, 5);
    expect(result).toEqual({ data: ["a", "b"], total: 10, page: 2, totalPages: 2 });
  });
});
