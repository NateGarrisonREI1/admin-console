// src/app/(app)/broker/dashboard/actions.ts
"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────

export type BrokerDashboardKPIs = {
  activeJobs: number;
  pending: number;
  completedThisMonth: number;
  totalJobs: number;
};

export type UrgentTask = {
  id: string;
  type: "hes" | "inspector";
  status: string;
  address: string;
  customer_name: string;
  created_at: string;
};

export type RecentActivity = {
  id: string;
  title: string;
  created_at: string;
  action: string;
};

export type QuickStats = {
  jobsOrderedThisMonth: number;
  jobsCompletedThisMonth: number;
  leafSentThisMonth: number;
  inNetworkProviders: number;
  outOfNetworkProviders: number;
};

export type BrokerDashboardData = {
  brokerName: string;
  kpis: BrokerDashboardKPIs;
  urgentTasks: UrgentTask[];
  recentActivity: RecentActivity[];
  quickStats: QuickStats;
};

// ─── Helpers ────────────────────────────────────────────────────────

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function fmtAddr(row: { address?: string | null; city?: string | null }): string {
  return [row.address, row.city].filter(Boolean).join(", ") || "Unknown address";
}

type JobRow = {
  id: string;
  status: string;
  address: string | null;
  city: string | null;
  customer_name: string;
  created_at: string;
  leaf_tier: string | null;
  network_status: string | null;
  team_member_id: string | null;
  team_member_name: string | null;
};

// ─── Main fetch ─────────────────────────────────────────────────────

export async function fetchBrokerDashboard(): Promise<BrokerDashboardData | null> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  // Get broker record
  const { data: broker } = await supabaseAdmin
    .from("brokers")
    .select("id, company_name")
    .eq("user_id", userId)
    .single();

  if (!broker) return null;
  const brokerId = broker.id;
  const brokerName = broker.company_name || "Your Company";

  const fields = "id, status, address, city, customer_name, created_at, leaf_tier, network_status, team_member_id, team_member_name";

  // Fetch all broker's jobs from both tables
  const [{ data: hesJobs }, { data: inspJobs }] = await Promise.all([
    supabaseAdmin
      .from("hes_schedule")
      .select(fields)
      .eq("broker_id", brokerId)
      .not("status", "in", "(cancelled,archived)"),
    supabaseAdmin
      .from("inspector_schedule")
      .select(fields)
      .eq("broker_id", brokerId)
      .not("status", "in", "(cancelled,archived)"),
  ]);

  const allJobs: (JobRow & { type: "hes" | "inspector" })[] = [
    ...((hesJobs ?? []) as JobRow[]).map((j) => ({ ...j, type: "hes" as const })),
    ...((inspJobs ?? []) as JobRow[]).map((j) => ({ ...j, type: "inspector" as const })),
  ];

  // ── KPIs ──────────────────────────────────────────────────────
  const activeStatuses = new Set(["scheduled", "en_route", "on_site", "field_complete", "report_ready", "pending_delivery"]);
  const pendingStatuses = new Set(["pending", "pending_delivery"]);
  const completedStatuses = new Set(["delivered", "completed"]);
  const ms = monthStart();

  const kpis: BrokerDashboardKPIs = {
    activeJobs: allJobs.filter((j) => activeStatuses.has(j.status)).length,
    pending: allJobs.filter((j) => pendingStatuses.has(j.status)).length,
    completedThisMonth: allJobs.filter((j) => completedStatuses.has(j.status) && j.created_at >= ms).length,
    totalJobs: allJobs.length,
  };

  // ── Urgent Tasks ──────────────────────────────────────────────
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const urgentTasks: UrgentTask[] = [];

  for (const j of allJobs) {
    if (j.status === "pending_delivery") {
      urgentTasks.push({ id: j.id, type: j.type, status: j.status, address: fmtAddr(j), customer_name: j.customer_name, created_at: j.created_at });
    } else if (j.status === "report_ready") {
      urgentTasks.push({ id: j.id, type: j.type, status: j.status, address: fmtAddr(j), customer_name: j.customer_name, created_at: j.created_at });
    } else if (j.status === "pending" && j.created_at < twoDaysAgo) {
      urgentTasks.push({ id: j.id, type: j.type, status: j.status, address: fmtAddr(j), customer_name: j.customer_name, created_at: j.created_at });
    }
  }
  // Sort by created_at desc (most recent first)
  urgentTasks.sort((a, b) => b.created_at.localeCompare(a.created_at));

  // ── Recent Activity ───────────────────────────────────────────
  // Get job IDs to query activity log
  const jobIds = allJobs.map((j) => j.id);
  let recentActivity: RecentActivity[] = [];

  if (jobIds.length > 0) {
    const { data: activityRows } = await supabaseAdmin
      .from("job_activity_log")
      .select("id, title, created_at, action")
      .in("job_id", jobIds)
      .order("created_at", { ascending: false })
      .limit(10);

    recentActivity = ((activityRows ?? []) as RecentActivity[]);
  }

  // ── Quick Stats ───────────────────────────────────────────────
  const jobsOrderedThisMonth = allJobs.filter((j) => j.created_at >= ms).length;
  const jobsCompletedThisMonth = kpis.completedThisMonth;
  const leafSentThisMonth = allJobs.filter(
    (j) => j.leaf_tier && j.leaf_tier !== "none" && j.created_at >= ms
  ).length;

  // Network: count distinct assessors
  const inNetworkIds = new Set<string>();
  const outOfNetworkIds = new Set<string>();
  for (const j of allJobs) {
    const memberId = j.team_member_id || j.team_member_name || null;
    if (!memberId) continue;
    const key = memberId;
    if (j.network_status === "out_of_network") {
      outOfNetworkIds.add(key);
    } else {
      inNetworkIds.add(key);
    }
  }

  const quickStats: QuickStats = {
    jobsOrderedThisMonth,
    jobsCompletedThisMonth,
    leafSentThisMonth,
    inNetworkProviders: inNetworkIds.size,
    outOfNetworkProviders: outOfNetworkIds.size,
  };

  return {
    brokerName,
    kpis,
    urgentTasks,
    recentActivity,
    quickStats,
  };
}
