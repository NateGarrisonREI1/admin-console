"use server";

import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type { AdminDashboardKpis, HesScheduleEntry, InspectorScheduleEntry, RevenueBreakdown } from "@/types/admin-ops";
import { fetchAdminDashboard } from "./dashboard";
import type { AdminDashboardData } from "./dashboard";

export type OpsDashboardData = {
  kpis: AdminDashboardKpis;
  schedule: {
    hes: HesScheduleEntry[];
    inspections: InspectorScheduleEntry[];
  };
  revenue: RevenueBreakdown;
  legacyData: AdminDashboardData;
};

const service = new AdminOpsService();

export async function fetchOpsDashboard(): Promise<OpsDashboardData> {
  const [kpis, schedule, revenue, legacyData] = await Promise.all([
    service.getDashboardKpis(),
    service.getTodaySchedule(),
    service.getRevenueBreakdown(),
    fetchAdminDashboard(),
  ]);

  return {
    kpis,
    schedule,
    revenue,
    legacyData,
  };
}
