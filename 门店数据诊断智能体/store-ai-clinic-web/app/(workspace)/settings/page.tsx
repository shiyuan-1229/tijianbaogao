import { QualityShell } from "@/features/quality/components/quality-shell";

export default async function SettingsPage() {
  return <QualityShell view="export" exportVariant="screenshot" />;
}