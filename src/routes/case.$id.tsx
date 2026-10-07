import { createFileRoute } from "@tanstack/react-router";
import { CasePage } from "@/components/benchmark/Benchmark";
export const Route = createFileRoute("/case/$id")({
  head: () => ({ meta: [{ title: "AXON Correction Benchmark" }] }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <CasePage id={id} />;
}
