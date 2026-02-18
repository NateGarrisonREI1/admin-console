export const dynamic = "force-dynamic";

import PartnersClient from "./PartnersClient";
import { fetchPartners, fetchDispatches } from "./actions";

export default async function PartnersPage() {
  const [partners, dispatches] = await Promise.all([
    fetchPartners(),
    fetchDispatches(),
  ]);

  return (
    <PartnersClient
      partners={partners}
      dispatches={dispatches}
    />
  );
}
