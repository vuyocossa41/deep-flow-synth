import { createFileRoute } from "@tanstack/react-router";
import { DemoShell } from "@/components/demo/DemoShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FounderOS — See it work on your company" },
      {
        name: "description",
        content:
          "Live AI orchestration demo. Type your company name. Watch Scout, Writer, Finance, and Decision OS work together with real-time reasoning, charts, and dynamic data.",
      },
      { property: "og:title", content: "FounderOS — Live AI demo" },
      {
        property: "og:description",
        content:
          "AI orchestration in 60 seconds — Scout, Writer, Finance, and Decision agents reasoning live on your company name.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <DemoShell />;
}
