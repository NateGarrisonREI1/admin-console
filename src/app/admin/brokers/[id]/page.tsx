// src/app/admin/brokers/[id]/page.tsx
export const dynamic = "force-dynamic";

import { fetchBrokerDetail } from "../data";
import BrokerDetailClient from "./BrokerDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function BrokerDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await fetchBrokerDetail(id);
  return <BrokerDetailClient data={data} />;
}
