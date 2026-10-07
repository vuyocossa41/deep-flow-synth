import { createFileRoute } from "@tanstack/react-router";
import { ResultPage } from "@/components/benchmark/Benchmark";
export const Route = createFileRoute("/result/$id")({
  head: () => ({ meta: [{ title: "AXON Correction Benchmark" }] }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <ResultPage id={id} />;
}
