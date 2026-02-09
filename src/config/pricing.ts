/**
 * Pricing & Billing Configuration
 *
 * NOT wired into the live app yet — this is the source of truth for
 * pricing tiers, limits, and terminology once billing is implemented.
 *
 * Terminology:
 *   "Data Source" = one connected ad account or Shopify store.
 *   Each platform OAuth may unlock multiple data sources (e.g. one Meta
 *   login discovers 10 ad accounts = 10 data sources). A data source only
 *   counts toward the plan limit when it is **assigned to a client** and
 *   **active**. Unassigned/inactive sources are free.
 */

export const BILLING_TERM = {
  /** What we call a billable unit in the UI */
  singular: "data source",
  plural: "data sources",
  /** Capitalized for headings */
  singularCap: "Data Source",
  pluralCap: "Data Sources",
} as const;

export interface PricingTier {
  id: string;
  name: string;
  /** Monthly price in USD (0 = free) */
  priceMonthly: number;
  /** Max active data sources */
  maxDataSources: number;
  /** Max team members */
  maxUsers: number;
  /** Features included */
  features: string[];
  /** CTA label */
  cta: string;
  /** Whether to show this tier publicly */
  visible: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    maxDataSources: 3,
    maxUsers: 1,
    features: [
      "3 data sources",
      "1 team member",
      "PPTX export",
      "Basic dashboard",
    ],
    cta: "Get Started",
    visible: true,
  },
  {
    id: "growth",
    name: "Growth",
    priceMonthly: 149,
    maxDataSources: 20,
    maxUsers: 5,
    features: [
      "20 data sources",
      "5 team members",
      "PPTX + Google Slides export",
      "Full dashboard & analytics",
      "AI-powered insights",
    ],
    cta: "Start Free Trial",
    visible: true,
  },
  {
    id: "scale",
    name: "Scale",
    priceMonthly: 399,
    maxDataSources: 60,
    maxUsers: 20,
    features: [
      "60 data sources",
      "20 team members",
      "Everything in Growth",
      "Custom branding",
      "Priority support",
    ],
    cta: "Start Free Trial",
    visible: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 0, // custom pricing
    maxDataSources: Infinity,
    maxUsers: Infinity,
    features: [
      "Unlimited data sources",
      "Unlimited team members",
      "Everything in Scale",
      "Dedicated account manager",
      "Custom integrations",
      "SSO / SAML",
      "SLA guarantee",
    ],
    cta: "Book a Demo",
    visible: true,
  },
];

/**
 * Helper: find the tier for a given plan ID
 */
export function getTier(planId: string): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.id === planId);
}

/**
 * Helper: check if an org can activate N more data sources
 */
export function canActivateSources(
  planId: string,
  currentActiveCount: number,
  additionalCount: number
): { allowed: boolean; limit: number; wouldUse: number } {
  const tier = getTier(planId) ?? PRICING_TIERS[0];
  const wouldUse = currentActiveCount + additionalCount;
  return {
    allowed: wouldUse <= tier.maxDataSources,
    limit: tier.maxDataSources,
    wouldUse,
  };
}
