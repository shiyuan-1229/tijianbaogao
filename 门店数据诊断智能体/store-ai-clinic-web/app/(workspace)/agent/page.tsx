import { QualityShell } from "@/features/quality/components/quality-shell";

export default async function AgentPage() {
  return <QualityShell view="detail" reportDetailVariant="screenshot" />;
}