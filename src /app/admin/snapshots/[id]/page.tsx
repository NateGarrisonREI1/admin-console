import { localSnapshots } from "../../_data/localSnapshots";

type Props = {
  params: { id: string };
};

export default function SnapshotDetailPage({ params }: Props) {
  const snapshot = localSnapshots.find(s => s.id === params.id);

  if (!snapshot) {
    return <div>Snapshot not found</div>;
  }

  return (
    <div>
      <h1>{snapshot.name}</h1>

      <h2>System</h2>
      <p>{snapshot.systemType}</p>

      <h2>Existing</h2>
      <ul>
        <li>Annual Cost: ${snapshot.existing.annualCost}</li>
        <li>Efficiency: {snapshot.existing.efficiency}</li>
      </ul>

      <h2>Proposed</h2>
      <ul>
        <li>Annual Cost: ${snapshot.proposed.annualCost}</li>
        <li>Efficiency: {snapshot.proposed.efficiency}</li>
      </ul>

      <h2>Results</h2>
      <ul>
        <li>Annual Savings: ${snapshot.results.annualSavings}</li>
        <li>Efficiency Gain: {snapshot.results.efficiencyGain}</li>
      </ul>
    </div>
  );
}
