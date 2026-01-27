import Image from "next/image";
import BrokerIntakeForm from "./BrokerIntakeForm";

export default function BrokerIntakePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        {/* Card */}
        <div className="relative bg-white rounded-2xl shadow-xl p-8 md:p-10">
          {/* Logo pinned to top-right of the card */}
          <div className="absolute right-6 top-6 md:right-8 md:top-8">
            <Image
              src="/brand/rei-logo.png"
              alt="Renewable Energy Incentives"
              width={190}
              height={52}
              priority
              className="opacity-95"
            />
          </div>

          <header className="mb-8 pr-44">
            <h1 className="text-3xl font-semibold text-gray-900">
              Request Energy Services for Your Listing
            </h1>
            <p className="mt-2 text-gray-600">
              Submit a request for a LEAF Snapshot, Inspection, or HES Report.
              Our team will follow up with next steps.
            </p>
          </header>

          <BrokerIntakeForm />
        </div>
      </div>
    </div>
  );
}
