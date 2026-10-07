import { createFileRoute } from "@tanstack/react-router";
import { BenchmarkPage } from "@/components/benchmark/Benchmark";
export const Route = createFileRoute("/benchmark")({
  head: () => ({ meta: [{ title: "AXON Economic Correction Benchmark" }] }),
  component: BenchmarkPage,
});
