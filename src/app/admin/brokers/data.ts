// src/app/admin/brokers/data.ts
import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type {
  AdminBrokerSummary,
  BrokerHealthScore,
  BrokerHealthAudit,
  BrokerHealthSummary,
} from "@/types/admin-ops";

export type BrokerDetailData = BrokerHealthAudit;

export type {
  AdminBrokerSummary,
  BrokerHealthScore,
  BrokerHealthSummary,
  BrokerHealthAudit,
};

export async function fetchBrokers(): Promise<AdminBrokerSummary[]> {
  const svc = new AdminOpsService();
  return svc.getBrokers();
}

export async function fetchBrokersWithHealth(): Promise<BrokerHealthSummary[]> {
  const svc = new AdminOpsService();
  return svc.getBrokersWithHealth();
}

export async function fetchBrokerDetail(brokerId: string): Promise<BrokerDetailData> {
  const svc = new AdminOpsService();
  return svc.getBrokerHealthAudit(brokerId);
}
