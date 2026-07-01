import { QualityShell } from "@/features/quality/components/quality-shell";

type TaskDetailPageProps = {
  params: Promise<{ taskId: string }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  await params;
  return <QualityShell view="detail" liveFromStore />;
}
