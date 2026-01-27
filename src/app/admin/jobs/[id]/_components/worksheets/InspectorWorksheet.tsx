import StageStripSection from "../sections/StageStripSection";
import PeopleSection from "../sections/PeopleSection";
import UtilitiesSection from "../sections/UtilitiesSection";
import ExistingSystemsSection from "../sections/ExistingSystemsSection";
import FilesSection from "../sections/FilesSection";
import NotesSection from "../sections/NotesSection";

type Stage = "pre_intake" | "utilities" | "systems" | "files" | "notes" | "done";

export default function InspectorWorksheet(props: {
  job: any;
  stage: Stage;
  stages: Stage[];
  hint: string | null;

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
}) {
  const {
    job,
    stage,
    stages,
    hint,
    updateCustomerAction,
    addUtilityRowAction,
    updateUtilityRowAction,
    deleteUtilityRowAction,
    upsertSystemsAction,
    uploadGeneralFileAction,
    updateNotesAction,
    utilities,
    systems,
    files,
  } = props;

  return (
    <div className="space-y-4">
      <StageStripSection jobId={job.id} stage={stage} stages={stages} hint={hint} />

      {stage === "pre_intake" && <PeopleSection job={job} updateCustomerAction={updateCustomerAction} />}

      {stage === "files" && (
        <FilesSection files={files} uploadGeneralFileAction={uploadGeneralFileAction} />
      )}

      {stage === "systems" && (
        <ExistingSystemsSection systems={systems} upsertSystemsAction={upsertSystemsAction} />
      )}

      {stage === "utilities" && (
        <UtilitiesSection
          utilities={utilities}
          addUtilityRowAction={addUtilityRowAction}
          updateUtilityRowAction={updateUtilityRowAction}
          deleteUtilityRowAction={deleteUtilityRowAction}
        />
      )}

      {stage === "notes" && <NotesSection job={job} updateNotesAction={updateNotesAction} />}

      {stage === "done" && (
        <div className="admin-card">
          <div style={{ fontWeight: 900, fontSize: 16 }}>Done</div>
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
            Phase 4: “Done” = intake complete. (No calculators yet.)
          </div>
        </div>
      )}
    </div>
  );
}
