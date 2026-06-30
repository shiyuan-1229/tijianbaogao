import { QualityShell } from "@/features/quality/components/quality-shell";
import { loadDefaultQualityAssets } from "@/features/quality/lib/default-assets";
import { loadDefaultQualityDataset } from "@/features/quality/lib/default-dataset";
import { loadDefaultQualityRules } from "@/features/quality/lib/default-rules";

export default async function QualityPage() {
  const [dataset, rules, assetSummary] = await Promise.all([
    loadDefaultQualityDataset(),
    loadDefaultQualityRules(),
    loadDefaultQualityAssets(),
  ]);

  return <QualityShell view="batch" dataset={dataset} rules={rules} assetSummary={assetSummary} />;
}
