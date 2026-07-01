import { QualityShell } from "@/features/quality/components/quality-shell";

export default async function AgentSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <QualityShell view="detail" detailFileName={decodeURIComponent(sessionId)} liveFromStore />;
}
