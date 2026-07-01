import { QualityShell } from "@/features/quality/components/quality-shell";

export default async function AgentSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await params;
  return <QualityShell view="detail" reportDetailVariant="screenshot" />;
}