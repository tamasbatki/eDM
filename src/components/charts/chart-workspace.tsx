"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { appendWorkflowChart, readWorkflowContext, writeWorkflowContext } from "@/lib/workflow-context";

type HistoryResponse = {
  symbol: string;
  range: string;
  points: Array<{ timestamp: string; close: number }>;
};

export function ChartWorkspace() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("AAPL");
  const [benchmarkSymbol, setBenchmarkSymbol] = useState("");
  const [range, setRange] = useState("1Y");
  const [variant, setVariant] = useState<"close-area" | "close-line">("close-area");
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [chartUrls, setChartUrls] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const context = readWorkflowContext();
    if (!context) return;

    if (context.chartImageUrls?.length) {
      setChartUrls(context.chartImageUrls);
      setImageUrl(context.chartImageUrls[context.chartImageUrls.length - 1]);
    }
  }, []);

  async function loadHistory(targetSymbol: string): Promise<HistoryResponse> {
    const historyRes = await fetch(
      `/api/finance/history?symbol=${encodeURIComponent(targetSymbol)}&range=${range}`,
    );

    const historyJson = (await historyRes.json()) as HistoryResponse & {
      error?: { message?: string };
    };

    if (!historyRes.ok) {
      throw new Error(historyJson.error?.message ?? "Could not fetch price history");
    }

    return historyJson;
  }

  async function handleGenerate() {
    setLoading(true);
    setError("");

    try {
      const historyJson = await loadHistory(symbol);
      setData(historyJson);

      const benchmark = benchmarkSymbol.trim()
        ? await loadHistory(benchmarkSymbol.trim())
        : null;

      const chartRes = await fetch("/api/charts/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: historyJson.symbol,
          range,
          variant,
          points: historyJson.points,
          benchmarkSymbol: benchmark?.symbol,
          benchmarkPoints: benchmark?.points,
        }),
      });

      const chartJson = (await chartRes.json()) as {
        imageUrl?: string;
        error?: { message?: string };
      };

      if (!chartRes.ok || !chartJson.imageUrl) {
        throw new Error(chartJson.error?.message ?? "Could not render chart image");
      }

      const nextUrls = Array.from(new Set([...chartUrls, chartJson.imageUrl]));
      setImageUrl(chartJson.imageUrl);
      setChartUrls(nextUrls);
      appendWorkflowChart(chartJson.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function copyImageUrl() {
    if (!imageUrl) return;
    await navigator.clipboard.writeText(imageUrl);
  }

  function continueTo(path: "/pdf" | "/email-builder") {
    if (chartUrls.length) {
      writeWorkflowContext({ chartImageUrls: chartUrls, chartImageUrl: chartUrls[chartUrls.length - 1] });
    }
    router.push(`${path}?from=chart`);
  }

  function removeChart(url: string) {
    const next = chartUrls.filter((item) => item !== url);
    setChartUrls(next);
    setImageUrl(next[next.length - 1] ?? "");
    writeWorkflowContext({ chartImageUrls: next, chartImageUrl: next[next.length - 1] ?? "" });
  }

  return (
    <section className="space-y-5 rounded-2xl border border-brand-mist/60 bg-white/95 p-5 shadow-sm">
      <div className="grid gap-3 md:grid-cols-5">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="rounded-lg border border-brand-mist px-3 py-2 text-sm"
          placeholder="Ticker (pl. AAPL)"
        />
        <input
          value={benchmarkSymbol}
          onChange={(e) => setBenchmarkSymbol(e.target.value)}
          className="rounded-lg border border-brand-mist px-3 py-2 text-sm"
          placeholder="Benchmark (opcionalis, pl. SPY)"
        />
        <select value={range} onChange={(e) => setRange(e.target.value)} className="rounded-lg border border-brand-mist px-3 py-2 text-sm">
          {[
            ["1M", "1 honap"],
            ["3M", "3 honap"],
            ["6M", "6 honap"],
            ["1Y", "1 ev"],
            ["3Y", "3 ev"],
            ["5Y", "5 ev"],
            ["MAX", "Max"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={variant}
          onChange={(e) => setVariant(e.target.value as "close-area" | "close-line")}
          className="rounded-lg border border-brand-mist px-3 py-2 text-sm"
        >
          <option value="close-area">Terulet diagram</option>
          <option value="close-line">Sima vonaldiagram</option>
        </select>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {loading ? "Generalas..." : "Grafikon generalasa"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {imageUrl && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">Legutobbi grafikon</p>
          <img src={imageUrl} alt="Financial chart" className="w-full rounded-xl border border-brand-mist" />
          <div className="flex flex-wrap gap-2">
            <a href={imageUrl} target="_blank" rel="noreferrer" className="rounded border px-3 py-1 text-xs">Kep megnyitasa</a>
            <a href={imageUrl} download className="rounded border px-3 py-1 text-xs">PNG letoltes</a>
            <button onClick={copyImageUrl} className="rounded border px-3 py-1 text-xs">URL masolasa</button>
            <button onClick={() => continueTo("/pdf")} className="rounded bg-brand-navy px-3 py-1 text-xs text-white">Tovabb PDF-hez</button>
            <button onClick={() => continueTo("/email-builder")} className="rounded bg-brand-teal px-3 py-1 text-xs text-white">Tovabb Emailhez</button>
          </div>
        </div>
      )}

      {chartUrls.length > 0 && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-semibold text-brand-navy">Workflow chart lista ({chartUrls.length})</p>
          <div className="space-y-2">
            {chartUrls.map((url, index) => (
              <div key={url} className="flex items-center gap-2">
                <button onClick={() => setImageUrl(url)} className="rounded border px-2 py-1 text-xs">
                  Chart {index + 1}
                </button>
                <input readOnly value={url} className="w-full rounded border px-2 py-1 text-xs" />
                <button onClick={() => removeChart(url)} className="rounded border px-2 py-1 text-xs text-red-600">
                  Torles
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && (
        <p className="text-sm text-slate-600">
          Betoltott pontok: {data.points.length} ({data.symbol}, {data.range}) - stilus: {variant === "close-area" ? "terulet" : "vonal"}.
        </p>
      )}
    </section>
  );
}
