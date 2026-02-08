/**
 * Typed Error Hierarchy
 *
 * All external service errors are caught and mapped to these types.
 * Each carries a recovery action so the error handler and UI know what to do.
 */

export type RecoveryAction =
  | "reconnect"          // Token expired — prompt user to re-authenticate
  | "retry_with_backoff" // Rate limit or transient error — retry automatically
  | "retry_once"         // Might work on second try
  | "abort_with_message" // Unrecoverable — show error to user
  | "select_account";    // Account issue — prompt user to pick a different account

export class PrismError extends Error {
  public readonly code: string;
  public readonly recoveryAction: RecoveryAction;
  public readonly platform?: string;
  public readonly retryAfterMs?: number;

  constructor(
    message: string,
    code: string,
    recoveryAction: RecoveryAction,
    options?: {
      platform?: string;
      retryAfterMs?: number;
      cause?: unknown;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = "PrismError";
    this.code = code;
    this.recoveryAction = recoveryAction;
    this.platform = options?.platform;
    this.retryAfterMs = options?.retryAfterMs;
  }
}

export class TokenExpiredError extends PrismError {
  constructor(platform: string, cause?: unknown) {
    super(
      `Your ${platform} connection has expired. Please reconnect.`,
      "TOKEN_EXPIRED",
      "reconnect",
      { platform, cause }
    );
    this.name = "TokenExpiredError";
  }
}

export class RateLimitError extends PrismError {
  constructor(platform: string, retryAfterMs: number, cause?: unknown) {
    super(
      `Rate limited by ${platform}. Retrying automatically...`,
      "RATE_LIMITED",
      "retry_with_backoff",
      { platform, retryAfterMs, cause }
    );
    this.name = "RateLimitError";
  }
}

export class ApiError extends PrismError {
  public readonly statusCode?: number;

  constructor(
    platform: string,
    message: string,
    statusCode?: number,
    cause?: unknown
  ) {
    super(
      `${platform} API error: ${message}`,
      "API_ERROR",
      "abort_with_message",
      { platform, cause }
    );
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

export class NetworkError extends PrismError {
  constructor(platform: string, cause?: unknown) {
    super(
      `Network error connecting to ${platform}. Retrying...`,
      "NETWORK_ERROR",
      "retry_with_backoff",
      { platform, retryAfterMs: 2000, cause }
    );
    this.name = "NetworkError";
  }
}

export class DataValidationError extends PrismError {
  constructor(message: string, platform?: string) {
    super(
      `Data validation error: ${message}`,
      "DATA_VALIDATION",
      "abort_with_message",
      { platform }
    );
    this.name = "DataValidationError";
  }
}

export class AccountAccessError extends PrismError {
  constructor(platform: string, cause?: unknown) {
    super(
      `Cannot access the selected ${platform} ad account. Check permissions or select a different account.`,
      "ACCOUNT_ACCESS",
      "select_account",
      { platform, cause }
    );
    this.name = "AccountAccessError";
  }
}
