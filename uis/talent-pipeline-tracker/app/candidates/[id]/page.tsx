import { CandidateDetailView } from "@/components/CandidateDetailView";

interface CandidateDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CandidateDetailPage({
  params,
}: CandidateDetailPageProps) {
  const resolvedParams = await params;

  return <CandidateDetailView id={resolvedParams.id} />;
}