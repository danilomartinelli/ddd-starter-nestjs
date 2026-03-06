export interface ThrottleOptions {
  /** Rate limit window in milliseconds */
  ttl: number;
  /** Max requests per window */
  limit: number;
}

export interface BootstrapSecurityOptions {
  corsOrigins?: string[];
  corsCredentials?: boolean;
}
