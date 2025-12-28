import { localSnapshots } from "../_data/localSnapshots";

export default function SnapshotsPage() {
  return (
    <div>
      <h1>System Snapshots</h1>

      <ul>
        {localSnapshots.map((s) => (
          <li key={s.id}>
            <strong>{s.name}</strong>
            <div>System: {s.systemType}</div>
            <div>Annual Savings: ${s.results.annualSavings}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
