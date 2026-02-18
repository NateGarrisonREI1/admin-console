export const dynamic = "force-dynamic";

import { fetchContactDetail } from "./actions";
import ContactDetailClient from "./ContactDetailClient";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchContactDetail(id);

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
          Contact not found or you are not signed in.
        </div>
      </div>
    );
  }

  return <ContactDetailClient contact={data.contact} history={data.history} />;
}
