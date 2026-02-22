// src/app/(app)/broker/_components/NewRequestModalProvider.tsx
"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import NewRequestModal from "./NewRequestModal";
import type { BrokerProfile } from "../request/actions";
import type { ServiceCategory } from "@/app/request/actions";
import type { ClientLinkInfo } from "../dashboard/actions";

// ─── Context ────────────────────────────────────────────────────────

type NewRequestModalContextValue = {
  open: () => void;
};

const NewRequestModalContext = createContext<NewRequestModalContextValue>({
  open: () => {},
});

export function useNewRequestModal() {
  return useContext(NewRequestModalContext);
}

// ─── Provider ───────────────────────────────────────────────────────

export default function NewRequestModalProvider({
  children,
  broker,
  catalog,
  clientLink,
  brokerName,
}: {
  children: React.ReactNode;
  broker: BrokerProfile | null;
  catalog: ServiceCategory[];
  clientLink: ClientLinkInfo;
  brokerName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const handleSuccess = useCallback(() => {
    setIsOpen(false);
    router.refresh();
  }, [router]);

  return (
    <NewRequestModalContext.Provider value={{ open }}>
      {children}
      <NewRequestModal
        isOpen={isOpen}
        onClose={close}
        onSuccess={handleSuccess}
        broker={broker}
        catalog={catalog}
        clientLink={clientLink}
        brokerName={brokerName}
      />
    </NewRequestModalContext.Provider>
  );
}
