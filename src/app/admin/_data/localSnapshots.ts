export type Snapshot = {
  id: string;
  name: string;

  systemType: string;

  existing: {
    annualCost: number;
    efficiency: number;
  };

  proposed: {
    annualCost: number;
    efficiency: number;
  };

  results: {
    annualSavings: number;
    efficiencyGain: number;
  };
};
