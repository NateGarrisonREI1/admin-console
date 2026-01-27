import Image from "next/image";
import Success from "../Success";

export default function BrokerSuccessPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="relative">
          <div className="absolute right-0 -top-2">
            <Image
              src="/brand/rei-logo.png"
              alt="Renewable Energy Incentives"
              width={170}
              height={46}
              priority
              className="opacity-95"
            />
          </div>
        </div>

        <div className="mt-14">
          <Success code={searchParams?.code} />
        </div>
      </div>
    </div>
  );
}

