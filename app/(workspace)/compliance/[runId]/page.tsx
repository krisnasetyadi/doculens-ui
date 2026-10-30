import { redirect } from "next/navigation";

/** Results moved to /analysis/[runId] (MS-916); links saved before that still open them. */
export default async function LegacyComplianceResultPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  redirect(`/analysis/${encodeURIComponent(runId)}`);
}
