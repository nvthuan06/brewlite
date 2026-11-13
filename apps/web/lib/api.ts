export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (Array.isArray(message)) return message.map(String).join("; ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/backend${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Không kết nối được máy chủ. Hãy kiểm tra backend NestJS ở cổng 3001.");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, errorMessage(payload, `Yêu cầu thất bại (HTTP ${response.status}).`));
  return payload as T;
}
