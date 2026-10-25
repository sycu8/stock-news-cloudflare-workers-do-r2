/**
 * Shared retry, R2 miss, and D1 reset handling for upstream flakes.
 * Missing R2 keys are cache misses: head first, and warn once per isolate if the
 * binding throws "key does not exist" instead of returning null. D1 storage resets
 * are retried once.
 */

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_MS = 250;
const MAX_RETRY_DELAY_MS = 2_000;
const RETRYABLE_UPSTREAM_STATUS = new Set([500, 502, 503, 504, 520, 522, 523, 524, 525, 530]);

const D1_RETRY = Symbol.for("vn.d1.retry");

type RetryableError = Error & { retryable?: boolean };

export function retryBaseMs(): number {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const raw = proc?.env?.HSX_RETRY_BASE_MS;
  if (raw === undefined || raw === "") return DEFAULT_RETRY_BASE_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_RETRY_BASE_MS;
}

/** Exponential backoff plus up to 30% jitter. `attempt` is the zero-based retry index. */
export function retryDelayMs(attempt: number, random: () => number = Math.random): number {
  const base = retryBaseMs();
  if (base === 0) return 0;
  const exp = Math.min(MAX_RETRY_DELAY_MS, base * 2 ** Math.max(0, attempt));
  const jitter = random() * exp * 0.3;
  return Math.round(exp + jitter);
}

export function isRetryableUpstreamStatus(status: number): boolean {
  return RETRYABLE_UPSTREAM_STATUS.has(status);
}

export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("retryable" in error && (error as RetryableError).retryable === false) return false;
  const name = "name" in error ? String((error as { name?: unknown }).name ?? "") : "";
  if (name === "TimeoutError" || name === "AbortError") return true;
  const message = error instanceof Error ? error.message : String(error);
  if (/upstream (500|502|503|504|520|522|523|524|525|530)\b/.test(message)) return true;
  if (/network|fetch failed|ECONNRESET|EAI_AGAIN|socket hang up/i.test(message)) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: { attempts?: number; isRetryable?: (error: unknown) => boolean }
): Promise<T> {
  const attempts = Math.max(1, options?.attempts ?? DEFAULT_RETRY_ATTEMPTS);
  const isRetryable = options?.isRetryable ?? isRetryableError;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < attempts - 1 && isRetryable(error);
      if (!canRetry) throw error;
      const wait = retryDelayMs(attempt);
      console.warn(`retrying after transient upstream error (attempt ${attempt + 1}/${attempts})`, error);
      await sleep(wait);
    }
  }
  throw lastError;
}

export function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const cause = "cause" in error && error.cause ? ` ${errorMessage(error.cause)}` : "";
    return `${error.name}: ${error.message}${cause}`;
  }
  if (error && typeof error === "object") {
    const record = error as { message?: unknown; code?: unknown; name?: unknown };
    const parts = [record.name, record.code, record.message].filter((part) => part != null).map(String);
    if (parts.length > 0) return parts.join(" ");
  }
  return String(error ?? "");
}

export function isMissingR2Key(error: unknown): boolean {
  return /specified key does not exist|nosuchkey|object not found/i.test(errorMessage(error));
}

let missingR2KeyWarned = false;

/** One warning per isolate when R2 throws for a missing key instead of returning null. */
export function warnMissingR2KeyOnce(key: string): void {
  if (missingR2KeyWarned) return;
  missingR2KeyWarned = true;
  console.warn(
    `R2 key does not exist (${key}); treating further missing keys as cache misses for the rest of this run`
  );
}

export function resetMissingR2KeyWarningForTests(): void {
  missingR2KeyWarned = false;
}

export async function readR2Object(bucket: R2Bucket, key: string): Promise<R2ObjectBody | null> {
  const existing = await headR2Object(bucket, key);
  if (!existing) return null;
  try {
    return await bucket.get(key);
  } catch (error) {
    if (isMissingR2Key(error)) {
      warnMissingR2KeyOnce(key);
      return null;
    }
    throw error;
  }
}

export async function headR2Object(bucket: R2Bucket, key: string): Promise<R2Object | null> {
  try {
    return await bucket.head(key);
  } catch (error) {
    if (isMissingR2Key(error)) {
      warnMissingR2KeyOnce(key);
      return null;
    }
    throw error;
  }
}

export function isTransientD1Error(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  return (
    message.includes("storage caused object to be reset") ||
    message.includes("d1_error") ||
    message.includes("network connection lost") ||
    message.includes("network request failed") ||
    message.includes("overloaded") ||
    message.includes("temporarily unavailable") ||
    message.includes("internal error") ||
    message.includes("sqlite_busy") ||
    message.includes("database is locked") ||
    message.includes("timeout") ||
    message.includes("d1 is overloaded")
  );
}

export async function withD1Retry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientD1Error(error)) throw error;
    console.warn("retrying D1 call once after transient error", error);
    return await operation();
  }
}

type ReadMethod = "all" | "first" | "raw";

function invoke(stmt: D1PreparedStatement, method: "run" | ReadMethod, args: unknown[]): Promise<unknown> {
  const fn = stmt[method] as (...a: unknown[]) => Promise<unknown>;
  return fn.apply(stmt, args);
}

function wrapStatement(db: D1Database, query: string, binds: unknown[] | null): D1PreparedStatement {
  const create = (): D1PreparedStatement => {
    const stmt = db.prepare(query);
    return binds ? stmt.bind(...(binds as never[])) : stmt;
  };
  return new Proxy(create(), {
    get(target, prop, receiver) {
      if (prop === "bind") {
        return (...next: unknown[]) => wrapStatement(db, query, next);
      }
      // INSERT/UPDATE/DELETE go through run(). Retrying those can double-toggle,
      // insert a second row, or surface an error after the first write committed.
      if (prop === "run") {
        return (...args: unknown[]) => invoke(create(), "run", args);
      }
      if (prop === "all" || prop === "first" || prop === "raw") {
        const method = prop as ReadMethod;
        return (...args: unknown[]) => withD1Retry(() => invoke(create(), method, args));
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    }
  }) as D1PreparedStatement;
}

/** Wrap a D1 binding so read statements are retried once. Writes are not retried. */
export function resilientD1(db: D1Database): D1Database {
  if ((db as D1Database & { [D1_RETRY]?: boolean })[D1_RETRY]) return db;
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === D1_RETRY) return true;
      if (prop === "prepare") {
        return (query: string) => wrapStatement(target, query, null);
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    }
  }) as D1Database;
}
