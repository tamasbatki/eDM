"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { readWorkflowContext, writeWorkflowContext } from "@/lib/workflow-context";

type GeneratedPdfResponse = {
  pdfUrl: string;
  filename: string;
  generatedAt: string;
  template: "market-update" | "portfolio-summary";
  error?: { message?: string };
};

export function PdfWorkspace() {
  const router = useRouter();
  const [template, setTemplate] = useState<"market-update" | "portfolio-summary">("market-update");
  const [body, setBody] = useState("");
  const [chartImageUrl, setChartImageUrl] = useState("");
  const [chartImageUrls, setChartImageUrls] = useState<string[]>([]);
  const [autoNextEmail, setAutoNextEmail] = useState(false);
  const [workflowNotice, setWorkflowNotice] = useState("");
  const [pdf, setPdf] = useState<GeneratedPdfResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function importFromWorkflow() {
    const context = readWorkflowContext();
    if (!context) {
      setWorkflowNotice("Nincs elerheto workflow adat.");
      return;
    }

    if (!body.trim() && context.aiText) {
      setBody(context.aiText);
    }

    const urls = context.chartImageUrls ?? [];
    if (urls.length) {
      setChartImageUrls(urls);
      setChartImageUrl(urls[0]);
    }

    setWorkflowNotice("Workflow adat betoltve (AI szoveg + chartok).");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("from")) importFromWorkflow();
    if (params.get("next") === "email") setAutoNextEmail(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError("");

    try {
      const selectedUrls = chartImageUrls.length ? chartImageUrls : chartImageUrl ? [chartImageUrl] : [];

      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, body, chartImageUrl, chartImageUrls: selectedUrls }),
      });

      const json = (await res.json()) as GeneratedPdfResponse;
      if (!res.ok) throw new Error(json.error?.message ?? "PDF generation failed");

      setPdf(json);
      writeWorkflowContext({
        pdfUrl: json.pdfUrl,
        aiText: body,
        chartImageUrls: selectedUrls,
        chartImageUrl: selectedUrls[0],
      });

      if (autoNextEmail) {
        router.push("/email-builder?from=pdf");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  function removeChart(url: string) {
    const next = chartImageUrls.filter((item) => item !== url);
    setChartImageUrls(next);
    if (!next.includes(chartImageUrl)) {
      setChartImageUrl(next[0] ?? "");
    }
  }

  return (
    <section className="space-y-4 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={importFromWorkflow} className="rounded border px-3 py-1 text-xs">Betoltes workflow-bol</button>
        {workflowNotice && <p className="text-xs text-slate-600">{workflowNotice}</p>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <select className="rounded border p-2" value={template} onChange={(e) => setTemplate(e.target.value as typeof template)}>
          <option value="market-update">Piaci helyzetkep</option>
          <option value="portfolio-summary">Portfolio osszefoglalo</option>
        </select>
        <input
          className="rounded border p-2"
          value={chartImageUrl}
          onChange={(e) => setChartImageUrl(e.target.value)}
          placeholder="Egyedi chart URL (opcionalis)"
        />
      </div>

      {chartImageUrls.length > 0 && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-semibold text-brand-navy">Behuzott chartok ({chartImageUrls.length})</p>
          {chartImageUrls.map((url, index) => (
            <div key={url} className="flex items-center gap-2">
              <input type="checkbox" checked={!chartImageUrl || chartImageUrl === url || chartImageUrls.includes(url)} readOnly />
              <span className="text-xs">Chart {index + 1}</span>
              <input readOnly value={url} className="w-full rounded border px-2 py-1 text-xs" />
              <button onClick={() => removeChart(url)} className="rounded border px-2 py-1 text-xs text-red-600">Torles</button>
            </div>
          ))}
        </div>
      )}

      <textarea
        className="h-56 w-full rounded border p-2"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Illeszd be az AI altal keszitett szoveget..."
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={autoNextEmail} onChange={(e) => setAutoNextEmail(e.target.checked)} />
        PDF utan automatikus tovabblepes Email builderbe
      </label>

      <button onClick={handleGenerate} disabled={loading} className="rounded bg-brand-navy px-4 py-2 text-white disabled:opacity-60">
        {loading ? "Generalas..." : "PDF generalasa"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {pdf && (
        <div className="text-sm text-slate-700">
          <p>PDF: <a className="text-brand-teal underline" href={pdf.pdfUrl} target="_blank">{pdf.pdfUrl}</a></p>
          <p>Fajlnev: {pdf.filename}</p>
          <p>Template: {pdf.template}</p>
          <p>Generalva: {new Date(pdf.generatedAt).toLocaleString("hu-HU")}</p>
        </div>
      )}
    </section>
  );
}
