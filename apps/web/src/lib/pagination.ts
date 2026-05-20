export function getPaginationParams(searchParams: URLSearchParams, defaultLimit = 50) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginatedResponse(data: any[], total: number, page: number, limit: number) {
  return { data, total, page, totalPages: Math.ceil(total / limit) };
}
