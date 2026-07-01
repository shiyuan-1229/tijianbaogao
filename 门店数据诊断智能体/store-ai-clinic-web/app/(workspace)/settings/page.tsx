import { QualityShell } from "@/features/quality/components/quality-shell";
import { loadDefaultQualityDataset } from "@/features/quality/lib/default-dataset";
import { loadDefaultQualityExports } from "@/features/quality/lib/default-exports";

export default async function SettingsPage() {
  const [dataset, exportSummary] = await Promise.all([loadDefaultQualityDataset(), loadDefaultQualityExports()]);

  return <QualityShell view="export" dataset={dataset} exportSummary={exportSummary} liveFromStore />;
}
