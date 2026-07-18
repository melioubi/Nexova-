import { CandidatesListView } from "@/components/CandidatesListView";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Cargando vista...</p>}>
      <CandidatesListView />
    </Suspense>
  );
}
