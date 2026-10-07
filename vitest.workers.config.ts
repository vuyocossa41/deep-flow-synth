import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { readD1Migrations } from "@cloudflare/vitest-plugin/config";
import { defineConfig } from "vitest/config";
export default defineConfig({
  plugins:[cloudflareTest(async()=>({
    main:"./test/benchmark/runtime-worker.ts",
    wrangler:{configPath:"./wrangler.jsonc"},
    miniflare:{bindings:{
      TEST_MIGRATIONS:await readD1Migrations("./migrations"),
      BENCHMARK_CASE_SECRET:"runtime-test-secret-at-least-32-characters",
      BENCHMARK_ORIGIN:"https://benchmark.test"
    }}
  }))],
  test:{include:["test/benchmark/runtime.test.ts"],testTimeout:30000}
});
