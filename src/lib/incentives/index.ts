import { resolveIncentivesV0 } from "./v0_dbCached/resolveIncentivesV0";

export async function resolveIncentives(args: {
  admin: any;
  zip: string;
  upgrades: { upgrade_catalog_id: string; upgrade_type_key: string | null }[];
}) {
  return resolveIncentivesV0(args);
}
