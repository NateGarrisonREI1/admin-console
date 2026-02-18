// src/app/(app)/broker/network/page.tsx
export const dynamic = "force-dynamic";

import { fetchNetwork, fetchPendingInvites } from "./actions";
import NetworkClient from "./NetworkClient";

export default async function BrokerNetworkPage() {
  const [data, pendingInvites] = await Promise.all([
    fetchNetwork(),
    fetchPendingInvites(),
  ]);

  if (!data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load network. Please sign in as a broker.
        </div>
      </div>
    );
  }

  return <NetworkClient broker={data.broker} contractors={data.contractors} pendingInvites={pendingInvites} />;
}
