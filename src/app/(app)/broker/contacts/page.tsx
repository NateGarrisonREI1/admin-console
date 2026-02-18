export const dynamic = "force-dynamic";

import { fetchContacts } from "./actions";
import ContactsClient from "./ContactsClient";

export default async function BrokerContactsPage() {
  const data = await fetchContacts();

  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div
          style={{
            borderRadius: 16,
            border: "1px solid rgba(248,113,113,0.25)",
            background: "rgba(248,113,113,0.06)",
            padding: 24,
            color: "#f87171",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Unable to load contacts. Please sign in as a broker.
        </div>
      </div>
    );
  }

  return <ContactsClient contacts={data.contacts} />;
}
