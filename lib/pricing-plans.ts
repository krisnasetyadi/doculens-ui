export interface Plan {
  id: "free" | "individual" | "team" | "enterprise";
  name: string;
  price: string;
  period: string;
  tagline: string;
  highlight: boolean;
  features: string[];
  cta: string;
}

/** Shared by the landing pricing section and the /payment checkout flow so
 * the two can never drift — the checkout summary always shows the exact
 * plan the pricing card advertised.
 *
 * "free" has no checkout step (nothing to charge) — its CTA routes straight
 * to /register instead of /payment. Its limits (source type, query cap,
 * storage) are advertised here but not yet enforced anywhere server-side —
 * that's a separate metering/quota feature, not part of this pricing UI. */
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "Rp 0",
    period: "/mo",
    tagline: "Try DocuLens with no cost, no card required",
    highlight: false,
    features: [
      "1 user",
      "PDF source only",
      "20 queries per month",
      "200 MB storage",
      "Personal use only",
    ],
    cta: "Start for Free",
  },
  {
    id: "individual",
    name: "Individual",
    price: "Rp 65.000",
    period: "/mo",
    tagline: "For individual researchers & professionals",
    highlight: false,
    features: [
      "1 user",
      "All source types (PDF, Database, Chat, Web Link)",
      "5 GB storage for your documents, chat logs, and data",
      "100% relevant retrieval",
      "Personal search history",
    ],
    cta: "Get Started",
  },
  {
    id: "team",
    name: "Team",
    price: "Rp 500.000",
    period: "/mo",
    tagline: "One shared knowledge base for small teams",
    highlight: true,
    features: [
      "5 team members + 1 admin seat",
      "Admin assigns which sources each member can access",
      "1 shared workspace — upload once, everyone can ask",
      "30 GB shared storage",
      "Centralized billing",
      "Priority support",
    ],
    cta: "Choose Team",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    tagline: "For organizations with custom requirements",
    highlight: false,
    features: [
      "Unlimited seats",
      "Custom storage — no fixed limit",
      "SSO & advanced access control",
      "Custom integrations (SharePoint, Google Drive, MongoDB)",
      "SLA & dedicated support",
      "On-premise / private cloud deployment",
    ],
    cta: "Contact Us",
  },
];

export function getPlan(id: string | null): Plan | undefined {
  return PLANS.find((plan) => plan.id === id);
}

export interface ComparisonRow {
  label: string;
  values: Record<Plan["id"], string | boolean>;
}

/** Feature-by-feature comparison shown below the pricing cards. A string
 * value renders as text; a boolean renders as a check or a dash. */
export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: "Users",
    values: { free: "1", individual: "1", team: "5 + 1 admin", enterprise: "Unlimited" },
  },
  {
    label: "Source types",
    values: {
      free: "PDF only",
      individual: "PDF, Database, Chat, Web",
      team: "PDF, Database, Chat, Web",
      enterprise: "All + custom integrations",
    },
  },
  {
    label: "Storage",
    values: { free: "200 MB", individual: "5 GB", team: "30 GB shared", enterprise: "Custom" },
  },
  {
    label: "Monthly queries",
    values: { free: "20", individual: "Unlimited", team: "Unlimited", enterprise: "Unlimited" },
  },
  {
    label: "Shared workspace",
    values: { free: false, individual: false, team: true, enterprise: true },
  },
  {
    label: "Priority support",
    values: { free: false, individual: false, team: true, enterprise: true },
  },
  {
    label: "SSO & access control",
    values: { free: false, individual: false, team: false, enterprise: true },
  },
  {
    label: "On-premise deployment",
    values: { free: false, individual: false, team: false, enterprise: true },
  },
];
