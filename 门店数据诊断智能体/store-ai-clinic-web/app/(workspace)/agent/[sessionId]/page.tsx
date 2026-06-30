import { QualityShell } from "@/features/quality/components/quality-shell";
import { loadDefaultQualityDataset } from "@/features/quality/lib/default-dataset";

export default async function AgentSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await params;
  const dataset = await loadDefaultQualityDataset();
  return <QualityShell view="detail" dataset={dataset} reportDetailVariant="screenshot" />;
}
