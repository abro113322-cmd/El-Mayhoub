const MAX_IDEMPOTENCY_KEY_LENGTH = 200;

export function createIdempotencyKey() {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("Secure idempotency key generation is unavailable.");
  }

  return globalThis.crypto.randomUUID();
}

export function validateIdempotencyKey(value: string | null) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();

  return (
    trimmed.length >= 8 &&
    trimmed.length <= MAX_IDEMPOTENCY_KEY_LENGTH &&
    !/[\u0000-\u001f\u007f]/.test(trimmed) &&
    /^[A-Za-z0-9._:-]+$/.test(trimmed)
  );
}
