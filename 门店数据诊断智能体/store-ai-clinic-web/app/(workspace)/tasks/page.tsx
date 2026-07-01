import { QualityShell } from "@/features/quality/components/quality-shell";

export default async function TasksPage() {
  return <QualityShell view="issues" issueListVariant="screenshot" />;
}