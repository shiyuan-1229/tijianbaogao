import { QualityShell } from "@/features/quality/components/quality-shell";

export default function TasksPage() {
  return <QualityShell view="issues" issueListVariant="summary" liveFromStore />;
}
