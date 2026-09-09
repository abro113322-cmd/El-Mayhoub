export async function apiRequest<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as
      | { error?: string }
      | undefined;
    throw new Error(payload?.error || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
