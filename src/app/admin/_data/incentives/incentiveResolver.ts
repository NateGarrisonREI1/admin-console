import type { CatalogSystem } from "../mockSystems";
import type { CatalogIncentive, JobAppliedIncentive, JobIncentiveScope } from "./incentiveTypes";

function normState(x: string) {
  return (x || "").trim().toUpperCase();
}
function normZip(x: string) {
  return (x || "").trim();
}

export function incentiveApplies(i: CatalogIncentive, jobZip: string, jobState: string) {
  const zip = normZip(jobZip);
  const state = normState(jobState);

  if (i.scope.type === "federal") return true;
  if (i.scope.type === "state") return i.scope.states.map(normState).includes(state);
  if (i.scope.type === "zip") return i.scope.zips.map(normZip).includes(zip);
  return false;
}

export function incentiveMatchesSystem(i: CatalogIncentive, systemId: string, systemTags: string[]) {
  if (i.systemIds?.includes(systemId)) return true;
  const tags = systemTags || [];
  const incTags = i.systemTags || [];
  return incTags.some((t) => tags.includes(t));
}

function mapScope(i: CatalogIncentive): JobIncentiveScope {
  if (i.scope.type === "federal") return "federal";
  if (i.scope.type === "state") return "state";
  return "local";
}

export function resolveApplicableIncentives(args: {
  catalogSystem: CatalogSystem;
  jobZip: string;
  jobState: string;
}): JobAppliedIncentive[] {
  const { catalogSystem, jobZip, jobState } = args;

  const incentives: CatalogIncentive[] = ((catalogSystem as any).incentives || []) as CatalogIncentive[];
  if (!incentives.length) return [];

  const systemTags = (catalogSystem.tags || []) as string[];

  return incentives
    .filter(
      (i) =>
        incentiveMatchesSystem(i, catalogSystem.id, systemTags) &&
        incentiveApplies(i, jobZip, jobState)
    )
    .map(
      (i): JobAppliedIncentive => ({
        id: i.id,
        name: i.name,
        amount: Number(i.amount) || 0,
        scope: mapScope(i),
        applied: true,
        source: "catalog" as const,
      })
    )
    .filter((i) => i.amount > 0);
}
export function groupIncentives(list: JobAppliedIncentive[]) {
  return {
    federal: list.filter((x) => x.scope === "federal"),
    state: list.filter((x) => x.scope === "state"),
    local: list.filter((x) => x.scope === "local"),
  };
}

export function sumApplied(list: JobAppliedIncentive[]) {
  return (list || []).reduce((sum, i) => sum + (i.applied ? i.amount : 0), 0);
}
