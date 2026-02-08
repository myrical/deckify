/**
 * Meta Ads OAuth API Routes
 *
 * Handles the OAuth redirect flow for connecting Meta Ads accounts.
 * /api/meta/auth       — redirects user to Facebook OAuth
 * /api/meta/callback   — handles the OAuth callback
 * /api/meta/accounts   — lists ad accounts after connection
 */

export { MetaAdsConnector } from "./connector";
