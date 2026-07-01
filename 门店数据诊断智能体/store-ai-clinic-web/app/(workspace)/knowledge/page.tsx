import { QualityShell } from "@/features/quality/components/quality-shell";
import { loadDefaultQualityRules } from "@/features/quality/lib/default-rules";

export default async function KnowledgePage() {
  const rules = await loadDefaultQualityRules();
  return <QualityShell view="rules" rules={rules} />;
}
