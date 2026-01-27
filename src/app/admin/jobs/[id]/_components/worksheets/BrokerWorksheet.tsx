import StageStripSection from "../sections/StageStripSection";
import NotesSection from "../sections/NotesSection";
import FilesSection from "../sections/FilesSection";

type Stage = "pre_intake" | "utilities" | "systems" | "files" | "notes" | "done";

function clean(v: any): string {
  return typeof v === "string" ? v.trim() : "";
}

function getRequestedOutputs(job: any): string[] {
  const arr = Array.isArray(job?.requested_outputs) ? job.requested_outputs : [];
  return arr.filter((x) => typeof x === "string");
}

function hasOutput(job: any, v: string) {
  return getRequestedOutputs(job).includes(v);
}

function payload(job: any) {
  return (job?.intake_payload && typeof job.intake_payload === "object") ? job.intake_payload : {};
}

function getIn(obj: any, path: string[], fallback: any = "") {
  let cur = obj;
  for (const k of path) {
    if (!cur || typeof cur !== "object") return fallback;
    cur = cur[k];
  }
  return cur ?? fallback;
}

export default function BrokerWorksheet(props: {
  job: any;

  stage: Stage;
  stages: Stage[];
  hint: string | null;

  setStageAction: (formData: FormData) => Promise<void>;

  // existing actions from page.tsx
  updateCustomerAction: (formData: FormData) => Promise<void>;
  uploadGeneralFileAction: (formData: FormData) => Promise<void>;
  updateNotesAction: (formData: FormData) => Promise<void>;

  // data
  files: any[];
}) {
  const { job, stage, stages, hint } = props;

  const intake = payload(job);

  const requested = getRequestedOutputs(job);
  const isLeaf = hasOutput(job, "leaf_snapshot");
  const isInspection = hasOutput(job, "inspection");
  const isHes = hasOutput(job, "hes_report");

  // Defaults for broker/client fields in intake_payload (stored as JSON)
  const brokerName = getIn(intake, ["broker", "name"], "");
  const brokerEmail = getIn(intake, ["broker", "email"], "");
  const brokerPhone = getIn(intake, ["broker", "phone"], "");
  const brokerage = getIn(intake, ["broker", "brokerage"], "");

  const clientName = getIn(intake, ["client", "name"], "");
  const clientEmail = getIn(intake, ["client", "email"], "");
  const clientPhone = getIn(intake, ["client", "phone"], "");

  const propType = getIn(intake, ["property", "type"], "");
  const propSqft = getIn(intake, ["property", "sqft"], "");
  const propYearBuilt = getIn(intake, ["property", "year_built"], "");

  const goalsUseCases = getIn(intake, ["broker_goals", "use_cases"], []);
  const goalsTimeline = getIn(intake, ["broker_goals", "timeline"], "");

  // We will store broker/client/goals/property bits via updateCustomerAction for now
  // by passing them in hidden fields and letting page.tsx update intake_payload.
  //
  // IMPORTANT: If your current updateCustomerAction does NOT yet write intake_payload,
  // this UI will still render and save base job fields (name/type/address). We’ll add
  // the intake_payload write next (small change).
  //
  // For now: include the payload fields so you can wire them into updateCustomerAction
  // when ready without changing this UI.
  const serviceCopy = isHes
    ? "HES Report: inspection is required. Upload it here or we’ll coordinate."
    : isInspection
    ? "Inspection: upload any disclosures, listing packet, or prior reports if available."
    : "LEAF Snapshot: inspection helps accuracy but is not required.";

  return (
    <div className="space-y-4">
      {/* Stage strip (keeps navigation stable) */}
      <StageStripSection
        job={job}
        stage={stage}
        stages={stages}
        hint={hint}
        setStageAction={props.setStageAction}
      />

      {/* ====== PEOPLE / SERVICE (Broker-first) ====== */}
      {stage === "pre_intake" && (
        <div className="space-y-4">
          {/* Service requested */}
          <div className="admin-card">
            <div style={{ fontWeight: 950, fontSize: 16 }}>What service do you need?</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
              Pick one. This tailors the rest of the worksheet.
            </div>

          <form action={props.updateCustomerAction} style={{ marginTop: 12 }}>
  <input type="hidden" name="customer_type" value="agent_broker" />

  <div style={{ display: "grid", gap: 10 }}>
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <input
        type="checkbox"
        name="requested_outputs"
        value="leaf_snapshot"
        defaultChecked={requested.includes("leaf_snapshot")}
      />
      <div>
        <div style={{ fontWeight: 900 }}>LEAF Snapshot</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Side-by-side system upgrade comparison + incentives.
        </div>
      </div>
    </label>

    <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <input
        type="checkbox"
        name="requested_outputs"
        value="inspection"
        defaultChecked={requested.includes("inspection")}
      />
      <div>
        <div style={{ fontWeight: 900 }}>Inspection</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Schedule or attach an inspection report.
        </div>
      </div>
    </label>

    <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <input
        type="checkbox"
        name="requested_outputs"
        value="hes_report"
        defaultChecked={requested.includes("hes_report")}
      />
      <div>
        <div style={{ fontWeight: 900 }}>HES Report</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          DOE Home Energy Score–style report.
        </div>
      </div>
    </label>
  </div>

  <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
    <button className="admin-btn" type="submit">
      Save services
    </button>
  </div>
</form>

          </div>

          {/* Broker + Client */}
          <div className="admin-card">
            <div style={{ fontWeight: 950, fontSize: 16 }}>Broker & Client</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
              We’ll use this for coordination + delivery.
            </div>

            <form action={props.updateCustomerAction} style={{ marginTop: 12 }}>
              <input type="hidden" name="customer_type" value="agent_broker" />

              {/* These fields are for future wiring into intake_payload */}
              <input type="hidden" name="broker_name" defaultValue={brokerName} />
              <input type="hidden" name="broker_email" defaultValue={brokerEmail} />
              <input type="hidden" name="broker_phone" defaultValue={brokerPhone} />
              <input type="hidden" name="brokerage" defaultValue={brokerage} />
              <input type="hidden" name="client_name" defaultValue={clientName} />
              <input type="hidden" name="client_email" defaultValue={clientEmail} />
              <input type="hidden" name="client_phone" defaultValue={clientPhone} />

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
                {/* Broker */}
                <div style={{ gridColumn: "span 12", fontWeight: 900, opacity: 0.8 }}>
                  Broker
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Broker name</div>
                  <input className="admin-input" style={{ width: "100%" }} name="broker_name" defaultValue={brokerName} />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Brokerage</div>
                  <input className="admin-input" style={{ width: "100%" }} name="brokerage" defaultValue={brokerage} />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Broker email</div>
                  <input className="admin-input" style={{ width: "100%" }} name="broker_email" defaultValue={brokerEmail} />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Broker phone</div>
                  <input className="admin-input" style={{ width: "100%" }} name="broker_phone" defaultValue={brokerPhone} />
                </div>

                {/* Client */}
                <div style={{ gridColumn: "span 12", fontWeight: 900, opacity: 0.8, marginTop: 6 }}>
                  Client
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Client name</div>
                  <input className="admin-input" style={{ width: "100%" }} name="client_name" defaultValue={clientName} />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Client email (optional)</div>
                  <input className="admin-input" style={{ width: "100%" }} name="client_email" defaultValue={clientEmail} />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Client phone (optional)</div>
                  <input className="admin-input" style={{ width: "100%" }} name="client_phone" defaultValue={clientPhone} />
                </div>

                {/* Base job fields (still canonical) */}
                <div style={{ gridColumn: "span 12", marginTop: 8, fontWeight: 900, opacity: 0.8 }}>
                  Property address
                </div>

                <div style={{ gridColumn: "span 12" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Street</div>
                  <input className="admin-input" style={{ width: "100%" }} name="address1" defaultValue={job.address1 ?? ""} />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>City</div>
                  <input className="admin-input" style={{ width: "100%" }} name="city" defaultValue={job.city ?? ""} />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>State</div>
                  <input className="admin-input" style={{ width: "100%" }} name="state" defaultValue={job.state ?? ""} maxLength={2} />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>ZIP</div>
                  <input className="admin-input" style={{ width: "100%" }} name="zip" defaultValue={job.zip ?? ""} />
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <button className="admin-btn" type="submit">
                  Save broker & property
                </button>
              </div>
            </form>
          </div>

          {/* Property basics (extra) */}
          <div className="admin-card">
            <div style={{ fontWeight: 950, fontSize: 16 }}>Property basics</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
              If you don’t know something, leave it blank — we can estimate later.
            </div>

            <form action={props.updateCustomerAction} style={{ marginTop: 12 }}>
              <input type="hidden" name="customer_type" value="agent_broker" />

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
                <div style={{ gridColumn: "span 6" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Property type</div>
                  <select className="admin-input" style={{ width: "100%" }} name="property_type" defaultValue={propType}>
                    <option value="">—</option>
                    <option value="sfh">Single-family</option>
                    <option value="condo">Condo / Townhome</option>
                    <option value="2_4_unit">Small multifamily (2–4)</option>
                  </select>
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Approx sqft</div>
                  <input
                    className="admin-input"
                    style={{ width: "100%" }}
                    name="property_sqft"
                    defaultValue={typeof propSqft === "number" ? String(propSqft) : clean(propSqft)}
                    placeholder="e.g. 2200"
                  />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Year built (optional)</div>
                  <input
                    className="admin-input"
                    style={{ width: "100%" }}
                    name="property_year_built"
                    defaultValue={typeof propYearBuilt === "number" ? String(propYearBuilt) : clean(propYearBuilt)}
                    placeholder="e.g. 1985"
                  />
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <button className="admin-btn" type="submit">
                  Save property basics
                </button>
              </div>
            </form>
          </div>

          {/* Goals */}
          <div className="admin-card">
            <div style={{ fontWeight: 950, fontSize: 16 }}>What are you trying to achieve?</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
              Helps us tailor the report and turnaround.
            </div>

            <form action={props.updateCustomerAction} style={{ marginTop: 12 }}>
              <input type="hidden" name="customer_type" value="agent_broker" />

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Use case</div>

                {[
                  ["prep_for_listing", "Prep for listing"],
                  ["pricing_justification", "Pricing justification"],
                  ["buyer_education", "Buyer education"],
                  ["compliance", "Compliance / program requirement"],
                ].map(([val, label]) => {
                  const checked = Array.isArray(goalsUseCases) ? goalsUseCases.includes(val) : false;
                  return (
                    <label key={val} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input type="checkbox" name="goal_use_cases" value={val} defaultChecked={checked} />
                      <span style={{ fontWeight: 900 }}>{label}</span>
                    </label>
                  );
                })}

                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Timeline</div>
                <select className="admin-input" name="goal_timeline" defaultValue={goalsTimeline} style={{ maxWidth: 360 }}>
                  <option value="">—</option>
                  <option value="asap">ASAP (1–3 days)</option>
                  <option value="this_week">This week</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>

              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <button className="admin-btn" type="submit">
                  Save goals
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== FILES ====== */}
      {stage === "files" && (
        <div className="admin-card">
          <div style={{ fontWeight: 950, fontSize: 16 }}>Upload what you already have</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{serviceCopy}</div>

          <div style={{ marginTop: 12 }}>
            <FilesSection
              job={job}
              files={props.files}
              uploadGeneralFileAction={props.uploadGeneralFileAction}
            />
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Suggested uploads: inspection, listing packet, disclosures, utility bills (optional), photos (optional).
          </div>
        </div>
      )}

      {/* ====== NOTES ====== */}
      {stage === "notes" && (
        <NotesSection job={job} updateNotesAction={props.updateNotesAction} />
      )}

      {/* ====== DONE ====== */}
      {stage === "done" && (
        <div className="admin-card">
          <div style={{ fontWeight: 950, fontSize: 16 }}>Done</div>
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
            Broker intake complete. Next step: REI Admin verifies docs and produces the requested output.
          </div>
        </div>
      )}

      {/* For broker V1 we intentionally don’t use utilities/systems stages */}
      {(stage === "utilities" || stage === "systems") && (
        <div className="admin-card">
          <div style={{ fontWeight: 950, fontSize: 16 }}>Not needed for brokers (V1)</div>
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
            Utilities and systems will be gathered from docs when available. Brokers shouldn’t be forced into energy jargon.
          </div>
        </div>
      )}
    </div>
  );
}
