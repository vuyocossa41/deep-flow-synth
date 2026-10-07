import { createFileRoute } from "@tanstack/react-router";
import { SubmitPage } from "@/components/benchmark/Benchmark";
export const Route = createFileRoute("/submit")({
  head: () => ({ meta: [{ title: "Submit a correction" }] }),
  component: SubmitPage,
});
