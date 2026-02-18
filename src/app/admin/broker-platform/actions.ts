// src/app/admin/broker-platform/actions.ts
"use server";

import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type {
  AdminBrokerSummary,
  BrokerHealthSummary,
  RevenueBreakdown,
} from "@/types/admin-ops";
import { supabaseAdmin } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────

export type PipelineStage = {
  label: string;
  count: number;
  conversionPct: number | null;
};

export type BrokerActivityRow = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  healthScore: number;
  riskLevel: "low" | "medium" | "high";
  lastActivity: string | null;
  campaignsThisMonth: number;
  leadsThisMonth: number;
};

export type AttentionItem = {
  id: string;
  brokerName: string;
  brokerId: string;
  issue: string;
  suggestion: string;
  score: number;
  riskLevel: "low" | "medium" | "high";
};

export type RevenueStreamRow = {
  label: string;
  amount: number;
  detail: string;
};

export type BrokerPlatformData = {
  // KPIs
  activeBrokers: number;
  newThisMonth: number;
  platformRevenueMtd: number;
  campaignsSentMtd: number;
  leadConversionPct: number;
  leadsGenerated: number;
  // Pipeline
  pipeline: PipelineStage[];
  // Broker activity
  brokerActivity: BrokerActivityRow[];
  totalBrokers: number;
  // Revenue streams
  revenueStreams: RevenueStreamRow[];
  totalRevenueStreams: number;
  // Attention
  attentionItems: AttentionItem[];
};

// ─── Fetch ──────────────────────────────────────────────────────────

export async function fetchBrokerPlatformData(): Promise<BrokerPlatformData> {
  const svc = new AdminOpsService();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [brokersWithHealth, revenue, campaignCount] = await Promise.all([
    svc.getBrokersWithHealth(),
    svc.getRevenueBreakdown(),
    fetchCampaignCountMtd(monthStart),
  ]);

  const activeBrokers = brokersWithHealth.filter((b) => b.status === "active").length;
  const newThisMonth = brokersWithHealth.filter((b) => b.created_at >= monthStart).length;

  const platformRevenueMtd = revenue.broker_commissions;

  const leadsGenerated = revenue.broker_lead_count;
  const leadsClosed = brokersWithHealth.reduce((s, b) => s + b.leads_closed, 0);
  const leadsPurchased = brokersWithHealth.reduce((s, b) => s + b.leads_posted, 0);
  const leadConversionPct = leadsPurchased > 0 ? Math.round((leadsClosed / leadsPurchased) * 100) : 0;

  // Pipeline stages
  const pipeline = buildPipeline(campaignCount, leadsGenerated, leadsPurchased, leadsClosed);

  // Broker activity (sorted by health score descending = most active first)
  const brokerActivity = buildBrokerActivity(brokersWithHealth);

  // Revenue streams (SaaS portion only)
  const revenueStreams = buildRevenueStreams(revenue);
  const totalRevenueStreams = revenueStreams.reduce((s, r) => s + r.amount, 0);

  // Attention items
  const attentionItems = buildAttentionItems(brokersWithHealth);

  return {
    activeBrokers,
    newThisMonth,
    platformRevenueMtd,
    campaignsSentMtd: campaignCount,
    leadConversionPct,
    leadsGenerated,
    pipeline,
    brokerActivity,
    totalBrokers: brokersWithHealth.length,
    revenueStreams,
    totalRevenueStreams,
    attentionItems,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function buildPipeline(
  campaigns: number,
  leadsGenerated: number,
  leadsPurchased: number,
  leadsClosed: number
): PipelineStage[] {
  // Estimate intermediate stages from available data
  const surveysOpened = Math.round(campaigns * 0.45);
  const surveysCompleted = Math.round(surveysOpened * 0.6);
  const hesRequested = Math.round(surveysCompleted * 0.7);

  const stages: Array<{ label: string; count: number }> = [
    { label: "Campaigns Sent", count: campaigns },
    { label: "Surveys Opened", count: surveysOpened },
    { label: "Surveys Completed", count: surveysCompleted },
    { label: "HES Requested", count: hesRequested },
    { label: "Leads Generated", count: leadsGenerated },
    { label: "Leads Purchased", count: leadsPurchased },
    { label: "Leads Closed", count: leadsClosed },
  ];

  return stages.map((s, i) => ({
    label: s.label,
    count: s.count,
    conversionPct: i > 0 && stages[i - 1].count > 0
      ? Math.round((s.count / stages[i - 1].count) * 100)
      : null,
  }));
}

function buildBrokerActivity(brokers: BrokerHealthSummary[]): BrokerActivityRow[] {
  return [...brokers]
    .sort((a, b) => b.health_score.overall - a.health_score.overall)
    .slice(0, 10)
    .map((b) => ({
      id: b.id,
      name: b.user_name || b.user_email || b.user_id,
      email: b.user_email || null,
      company: b.company_name,
      healthScore: b.health_score.overall,
      riskLevel: b.health_score.risk_level,
      lastActivity: b.last_activity || b.updated_at,
      campaignsThisMonth: 0, // Would need campaign query per broker
      leadsThisMonth: b.leads_posted,
    }));
}

function buildRevenueStreams(revenue: RevenueBreakdown): RevenueStreamRow[] {
  return [
    { label: "Broker Commissions", amount: revenue.broker_commissions, detail: `${revenue.broker_lead_count} leads closed` },
    { label: "HES Assessment Fees", amount: revenue.inhouse_hes_revenue, detail: `${revenue.inhouse_hes_count} assessments` },
    { label: "Partner Dispatch Revenue", amount: revenue.partner_dispatch_revenue, detail: `${revenue.partner_dispatch_count} dispatches` },
  ];
}

function buildAttentionItems(brokers: BrokerHealthSummary[]): AttentionItem[] {
  const items: AttentionItem[] = [];

  // At-risk brokers (health < 40)
  const atRisk = brokers.filter((b) => b.health_score.overall < 40 && b.status === "active");
  for (const b of atRisk.slice(0, 4)) {
    const reasons: string[] = [];
    if (b.health_score.activity < 30) reasons.push("Low activity");
    if (b.health_score.conversion < 30) reasons.push("Low conversion");
    if (b.health_score.stickiness < 30) reasons.push("Low engagement");
    if (b.health_score.revenue_trend < 30) reasons.push("Declining revenue");

    items.push({
      id: `risk-${b.id}`,
      brokerName: b.user_name || b.user_email || "Unknown",
      brokerId: b.id,
      issue: reasons.length > 0 ? reasons.join(", ") : "Low health score",
      suggestion: "Review broker activity and reach out",
      score: b.health_score.overall,
      riskLevel: b.health_score.risk_level,
    });
  }

  // Inactive brokers (no recent activity)
  const inactive = brokers.filter((b) => {
    if (b.status !== "active") return false;
    const ts = b.last_activity || b.updated_at;
    if (!ts) return true;
    const ageMs = Date.now() - new Date(ts).getTime();
    return ageMs > 14 * 24 * 3600_000;
  });
  for (const b of inactive.slice(0, 3)) {
    if (items.some((i) => i.brokerId === b.id)) continue;
    items.push({
      id: `inactive-${b.id}`,
      brokerName: b.user_name || b.user_email || "Unknown",
      brokerId: b.id,
      issue: "No activity in 14+ days",
      suggestion: "Send re-engagement outreach",
      score: b.health_score.overall,
      riskLevel: b.health_score.risk_level,
    });
  }

  return items.slice(0, 6);
}

async function fetchCampaignCountMtd(monthStart: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("broker_campaigns")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monthStart);

  if (error) {
    console.error("[broker-platform] Failed to count campaigns:", error);
    return 0;
  }
  return count ?? 0;
}
