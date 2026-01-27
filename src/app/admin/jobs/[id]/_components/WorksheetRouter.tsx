import HomeownerWorksheet from "./worksheets/HomeownerWorksheet";
import BrokerWorksheet from "./worksheets/BrokerWorksheet";
import InspectorWorksheet from "./worksheets/InspectorWorksheet";
import OtherWorksheet from "./worksheets/OtherWorksheet";

type Stage = "pre_intake" | "utilities" | "systems" | "files" | "notes" | "done";

type WorksheetProps = {
  job: any;
  jobId: string;

  stage: Stage;
  stages: Stage[];
  hint: string | null;

  setStageAction: (formData: FormData) => Promise<void>;
  updateCustomerAction: (formData: FormData) => Promise<void>;
  addUtilityRowAction: (formData: FormData) => Promise<void>;
  updateUtilityRowAction: (formData: FormData) => Promise<void>;
  deleteUtilityRowAction: (formData: FormData) => Promise<void>;
  upsertSystemsAction: (formData: FormData) => Promise<void>;
  uploadGeneralFileAction: (formData: FormData) => Promise<void>;
  updateNotesAction: (formData: FormData) => Promise<void>;

  utilities: any[];
  systems: any;
  files: any[];
};

export default function WorksheetRouter(props: WorksheetProps) {
  const customerType = props.job?.customer_type;

  if (customerType === "agent_broker") return <BrokerWorksheet {...props} />;
  if (customerType === "homeowner") return <HomeownerWorksheet {...props} />;
  if (customerType === "inspector") return <InspectorWorksheet {...props} />;
  return <OtherWorksheet {...props} />;
}
