import { notFound } from "next/navigation";
import { SimulatorView } from "@/components/simulator-view";
import { SEGMENT_TO_MODE } from "@/simulator/routes";
import type { AppMode } from "@/simulator/store";

export const metadata = { title: "Simulator — Axiom" };

type Props = { params: Promise<{ workspace: string }> };

export default async function WorkspacePage({ params }: Props) {
  const { workspace } = await params;
  const initialMode = SEGMENT_TO_MODE[workspace] as AppMode | undefined;
  if (!initialMode) notFound();
  return <SimulatorView initialMode={initialMode} />;
}
