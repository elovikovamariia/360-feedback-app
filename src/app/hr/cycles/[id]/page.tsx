import { HrCycleDetailPageClient } from "@/components/HrCycleDetailPageClient";

type Props = { params: { id: string } };

export default function CycleDetailPage({ params }: Props) {
  return <HrCycleDetailPageClient id={params.id} />;
}
