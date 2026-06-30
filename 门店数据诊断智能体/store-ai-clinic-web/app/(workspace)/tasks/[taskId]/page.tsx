import { QualityShell } from "@/features/quality/components/quality-shell";
import { loadDefaultQualityDataset } from "@/features/quality/lib/default-dataset";

type TaskDetailPageProps = {
  params: Promise<{ taskId: string }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  await params;
  const dataset = await loadDefaultQualityDataset();
  return <QualityShell view="detail" dataset={dataset} reportDetailVariant="screenshot" />;
}
