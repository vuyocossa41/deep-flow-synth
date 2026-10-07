import { createFileRoute } from "@tanstack/react-router";
import { ReviewPage } from "@/components/benchmark/Benchmark";
export const Route = createFileRoute("/review/$id")({
  head: () => ({ meta: [{ title: "AXON Correction Benchmark" }] }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <ReviewPage id={id} />;
}
