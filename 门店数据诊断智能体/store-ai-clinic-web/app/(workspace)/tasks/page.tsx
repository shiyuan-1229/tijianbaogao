import { QualityShell } from "@/features/quality/components/quality-shell";
import { loadDefaultQualityDataset } from "@/features/quality/lib/default-dataset";

export default async function TasksPage() {
  const dataset = await loadDefaultQualityDataset();
  return <QualityShell view="issues" dataset={dataset} issueListVariant="screenshot" />;
}
