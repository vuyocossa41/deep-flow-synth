import { useCallback, useState } from "react";

export interface ScoutProfile {
  name: string;
  product: string;
  icp: string;
  stage: string;
  signals: string;
  pain: string;
  angle: string;
}

export interface ScoutResult {
  domain: string;
  profile: ScoutProfile;
  message: string;
  score: "HOT" | "WARM" | "COLD";
  score_num: number;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useScout() {
  const [result, setResult] = useState<ScoutResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  const scout = useCallback(async (domain: string) => {
    const trimmed = domain.trim();
    if (!trimmed) {
      setError("Domain is required");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/scout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: trimmed }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const detail =
          data && typeof data === "object" && "detail" in data
            ? String((data as { detail: unknown }).detail)
            : `Scout failed (${res.status})`;
        throw new Error(detail);
      }

      setResult(data as ScoutResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scout request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { scout, result, loading, error, reset };
}
