// src/lib/incentives/incentiveTypes.ts

export type JobIncentiveScope = "federal" | "state" | "local";

export type JobAppliedIncentive = {
  id: string; // inherited from catalog (or generated for manual)
  name: string;
  amount: number;

  scope: JobIncentiveScope;
  applied: boolean;

  source: "catalog" | "manual";
};
