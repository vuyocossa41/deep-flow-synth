import { createFileRoute } from "@tanstack/react-router";
import { DemoShell } from "@/components/demo/DemoShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FounderOS — See it work on your company" },
      {
        name: "description",
        content:
          "Live Founder Operating System demo. Enter your domain. Watch autonomous infrastructure — Scout, Writer, Finance, and Decision — reason in real time.",
      },
      { property: "og:title", content: "FounderOS — Live AI demo" },
      {
        property: "og:description",
        content:
          "FounderOS in 60 seconds — autonomous infrastructure reasoning live on your company domain.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <DemoShell />;
}
