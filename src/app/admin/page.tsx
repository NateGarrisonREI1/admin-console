export default function AdminPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>LEAF SS – Management Console</h1>
      <p>Inline overrides will live here.</p>

      <section style={{ marginTop: 24 }}>
        <label>
          HVAC Rebate ($):
          <input
            type="number"
            defaultValue={2500}
            style={{ marginLeft: 8 }}
          />
        </label>
      </section>
    </main>
  );
}
