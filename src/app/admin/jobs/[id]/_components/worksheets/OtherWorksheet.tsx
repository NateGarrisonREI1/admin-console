import React from "react";
import WorksheetRouter from "../WorksheetRouter";

type WorksheetProps = React.ComponentProps<typeof WorksheetRouter>;

export default function OtherWorksheet(props: WorksheetProps) {
  return <WorksheetRouter {...props} />;
}
