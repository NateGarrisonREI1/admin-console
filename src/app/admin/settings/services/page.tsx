// src/app/admin/settings/services/page.tsx
export const dynamic = "force-dynamic";

import { fetchServiceCatalog } from "../../_actions/services";
import ServicesClient from "./ServicesClient";

export default async function ServicesPage() {
  const catalog = await fetchServiceCatalog();
  return <ServicesClient catalog={catalog} />;
}
