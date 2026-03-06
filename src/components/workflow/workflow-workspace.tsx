"use client";

import { useEffect, useMemo, useState } from "react";

import { writeWorkflowContext } from "@/lib/workflow-context";

type HistoryResponse = {
  symbol: string;
  range: string;
  points: Array<{ timestamp: string; close: number }>;
  error?: { message?: string; details?: unknown };
};

type ChartRenderResponse = {
  imageUrl?: string;
  error?: { message?: string; details?: unknown };
};

type NewsletterResponse = {
  sourceTitle?: string;
  sourceUrl?: string;
  draft?: {
    subject: string;
    preheader: string;
    title: string;
    lead: string;
    bodyHtml: string;
    ctaLabel: string;
  };
  html?: string;
  error?: { message?: string; details?: unknown };
};

type PdfResponse = {
  pdfUrl: string;
  filename: string;
  generatedAt: string;
  template: "market-update" | "portfolio-summary";
  error?: { message?: string; details?: unknown };
};

type EmailResponse = {
  html?: string;
  mjml?: string;
  error?: { message?: string; details?: unknown };
};

type TemplateSummary = {
  id: string;
  name: string;
  updatedAt: string;
};

const tickerExamples = ["AAPL", "MSFT", "GOOGL", "SPY", "^GSPC (S&P 500)", "^IXIC (Nasdaq)", "BTC-USD", "EURUSD=X", "CL=F"];

function htmlToPlainText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeSymbols(input: string): string[] {
  return Array.from(new Set(input.split(",").map((item) => item.trim().toUpperCase()).filter(Boolean)));
}

function parseApiError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const maybeError = (payload as { error?: { message?: string; details?: unknown } }).error;
  if (!maybeError?.message) return fallback;
  if (!maybeError.details) return maybeError.message;
  let detailsText = "";
  try {
    detailsText = JSON.stringify(maybeError.details);
  } catch {
    detailsText = String(maybeError.details);
  }
  return `${maybeError.message}: ${detailsText}`;
}

export function WorkflowWorkspace() {
  const [articleUrl, setArticleUrl] = useState("https://www.con.hu/concordeblog/tuzszunetre-varva-mennyi-potencial-maradt-a-regioban/");
  const [symbolsInput, setSymbolsInput] = useState("AAPL,MSFT");
  const [range, setRange] = useState("1Y");
  const [variant, setVariant] = useState<"close-area" | "close-line">("close-line");
  const [pdfTemplate, setPdfTemplate] = useState<"market-update" | "portfolio-summary">("market-update");
  const [emailTemplates, setEmailTemplates] = useState<TemplateSummary[]>([]);
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState("");
  const [generatePdf, setGeneratePdf] = useState(true);
  const [generateEmail, setGenerateEmail] = useState(true);

  const [status, setStatus] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [chartUrls, setChartUrls] = useState<string[]>([]);
  const [aiText, setAiText] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [emailHtml, setEmailHtml] = useState("");
  const [emailTemplateNotice, setEmailTemplateNotice] = useState("");
  const [symbolCheck, setSymbolCheck] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingSymbols, setCheckingSymbols] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState("");

  const symbols = useMemo(() => normalizeSymbols(symbolsInput), [symbolsInput]);

  useEffect(() => {
    void fetchEmailTemplates();
  }, []);

  async function fetchEmailTemplates() {
    setLoadingTemplates(true);
    setEmailTemplateNotice("");

    try {
      const res = await fetch("/api/email/templates", { cache: "no-store" });
      const json = (await res.json()) as {
        templates?: TemplateSummary[];
        error?: { message?: string };
      };

      if (!res.ok || !json.templates) {
        throw new Error(json.error?.message ?? "Email template lista betoltese sikertelen.");
      }

      const templateList = json.templates;
      setEmailTemplates(templateList);
      if (templateList.length > 0) {
        setSelectedEmailTemplateId((current) => current || templateList[0].id);
      }
      if (templateList.length === 0) {
        setEmailTemplateNotice("Még nincs elmentett email template. Előbb készíts egyet a Template Builderben.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function checkSymbols() {
    setCheckingSymbols(true);
    setSymbolCheck([]);

    try {
      if (symbols.length === 0) {
        setSymbolCheck(["Adj meg legalabb 1 ticker-t ellenorzeshez."]);
        return;
      }

      const lines: string[] = [];
      for (const symbol of symbols) {
        const res = await fetch(`/api/finance/history?symbol=${encodeURIComponent(symbol)}&range=1M`);
        const json = (await res.json()) as HistoryResponse;
        if (res.ok && json.points?.length) {
          lines.push(`OK: ${symbol} (${json.points.length} pont)`);
        } else {
          lines.push(`HIBA: ${symbol} - ${parseApiError(json, "Nincs elerheto adat")}`);
        }
      }
      setSymbolCheck(lines);
    } finally {
      setCheckingSymbols(false);
    }
  }

  async function generateAll() {
    setLoading(true);
    setError("");
    setWarnings([]);
    setStatus("Composer inditasa...");

    try {
      if (!generatePdf && !generateEmail) {
        throw new Error("Valassz legalabb egy kimenetet: PDF es/vagy Email.");
      }

      if (symbols.length === 0) {
        throw new Error("Adj meg legalabb 1 ticker-t.");
      }

      if (generateEmail && !selectedEmailTemplateId) {
        throw new Error("Valassz ki egy email template-et a generalashoz.");
      }

      setStatus("1/4 Chart generalas...");
      const generatedCharts: string[] = [];
      const chartWarnings: string[] = [];

      for (const symbol of symbols) {
        try {
          const historyRes = await fetch(`/api/finance/history?symbol=${encodeURIComponent(symbol)}&range=${range}`);
          const historyJson = (await historyRes.json()) as HistoryResponse;
          if (!historyRes.ok || !historyJson.points?.length) {
            throw new Error(parseApiError(historyJson, `Nincs adat: ${symbol}`));
          }

          const chartRes = await fetch("/api/charts/render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol: historyJson.symbol, range, variant, points: historyJson.points }),
          });
          const chartJson = (await chartRes.json()) as ChartRenderResponse;
          if (!chartRes.ok || !chartJson.imageUrl) {
            throw new Error(parseApiError(chartJson, `Chart hiba: ${symbol}`));
          }

          generatedCharts.push(chartJson.imageUrl);
        } catch (symbolError) {
          chartWarnings.push(`${symbol}: ${symbolError instanceof Error ? symbolError.message : "Ismeretlen chart hiba"}`);
        }
      }

      setChartUrls(generatedCharts);
      setWarnings(chartWarnings);

      setStatus("2/4 AI tartalom generalas...");
      const newsletterRes = await fetch("/api/ai/newsletter-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: articleUrl }),
      });
      const newsletterJson = (await newsletterRes.json()) as NewsletterResponse;

      if (!newsletterRes.ok || !newsletterJson.draft) {
        throw new Error(parseApiError(newsletterJson, "AI newsletter generalas sikertelen."));
      }

      const combinedText = [newsletterJson.draft.lead, htmlToPlainText(newsletterJson.draft.bodyHtml)].filter(Boolean).join("\n\n");
      setAiText(combinedText);

      let createdPdfUrl = "";
      let createdEmailHtml = "";
      if (generatePdf) {
        setStatus("3/4 PDF generalas...");
        const pdfRes = await fetch("/api/pdf/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template: pdfTemplate,
            body: combinedText,
            chartImageUrls: generatedCharts,
            chartImageUrl: generatedCharts[0] ?? "",
          }),
        });

        const pdfJson = (await pdfRes.json()) as PdfResponse;
        if (!pdfRes.ok || !pdfJson.pdfUrl) {
          throw new Error(parseApiError(pdfJson, "PDF generalas sikertelen."));
        }

        createdPdfUrl = pdfJson.pdfUrl;
        setPdfUrl(createdPdfUrl);
      } else {
        setPdfUrl("");
      }

      if (generateEmail) {
        setStatus("4/4 Email generalas a valasztott template alapjan...");
        const emailRes = await fetch("/api/email/render-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: selectedEmailTemplateId,
            newsletterTitle: newsletterJson.draft.title,
            newsletterLead: newsletterJson.draft.lead,
            newsletterBody: htmlToPlainText(newsletterJson.draft.bodyHtml),
            chartImageUrls: generatedCharts,
            pdfUrl: createdPdfUrl || undefined,
            sourceUrl: newsletterJson.sourceUrl,
          }),
        });

        const emailJson = (await emailRes.json()) as EmailResponse;
        if (!emailRes.ok || !emailJson.html) {
          throw new Error(parseApiError(emailJson, "Email generalas sikertelen."));
        }

        createdEmailHtml = emailJson.html;
        setEmailHtml(createdEmailHtml);
      } else {
        setEmailHtml("");
      }

      writeWorkflowContext({
        aiText: combinedText,
        newsletterHtml: generateEmail ? createdEmailHtml : newsletterJson.html,
        chartImageUrls: generatedCharts,
        chartImageUrl: generatedCharts[0],
        pdfUrl: createdPdfUrl || undefined,
        sourceTitle: newsletterJson.sourceTitle,
        sourceUrl: newsletterJson.sourceUrl,
      });

      setStatus("Kesz: composer sikeresen lefutott.");
    } catch (flowError) {
      setStatus("");
      setError(flowError instanceof Error ? flowError.message : "Composer hiba");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-brand-mist/60 bg-white/95 p-5 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <input value={articleUrl} onChange={(e) => setArticleUrl(e.target.value)} className="rounded-lg border border-brand-mist px-3 py-2 text-sm" placeholder="Cikk URL" />
        <input value={symbolsInput} onChange={(e) => setSymbolsInput(e.target.value)} className="rounded-lg border border-brand-mist px-3 py-2 text-sm" placeholder="Tickerek vesszovel elvalasztva (pl. AAPL,MSFT,SPY)" />

        <select value={range} onChange={(e) => setRange(e.target.value)} className="rounded-lg border border-brand-mist px-3 py-2 text-sm">
          {[ ["1M", "1 honap"], ["3M", "3 honap"], ["6M", "6 honap"], ["1Y", "1 ev"], ["3Y", "3 ev"], ["5Y", "5 ev"], ["MAX", "Max"] ].map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select value={variant} onChange={(e) => setVariant(e.target.value as "close-area" | "close-line")} className="rounded-lg border border-brand-mist px-3 py-2 text-sm">
          <option value="close-area">Terulet diagram</option>
          <option value="close-line">Sima vonaldiagram</option>
        </select>

        <select value={pdfTemplate} onChange={(e) => setPdfTemplate(e.target.value as "market-update" | "portfolio-summary")} className="rounded-lg border border-brand-mist px-3 py-2 text-sm">
          <option value="market-update">PDF template: Piaci helyzetkep</option>
          <option value="portfolio-summary">PDF template: Portfolio osszefoglalo</option>
        </select>

        <select value={selectedEmailTemplateId} onChange={(e) => setSelectedEmailTemplateId(e.target.value)} className="rounded-lg border border-brand-mist px-3 py-2 text-sm" disabled={loadingTemplates || emailTemplates.length === 0}>
          <option value="">Email template valasztasa</option>
          {emailTemplates.map((template) => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-5 rounded-lg border border-brand-mist px-3 py-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={generatePdf} onChange={(e) => setGeneratePdf(e.target.checked)} />PDF</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={generateEmail} onChange={(e) => setGenerateEmail(e.target.checked)} />Email</label>
        </div>
      </div>

      <div className="rounded-lg border border-brand-mist/70 bg-brand-mist/20 p-3 text-xs text-slate-700">
        <p className="font-semibold text-brand-navy">Template es ticker segitseg</p>
        <p className="mt-1">Yahoo ticker peldak: {tickerExamples.join(", ")}</p>
        <p className="mt-1">Email template-ek: {loadingTemplates ? "betoltes..." : `${emailTemplates.length} elerheto`}</p>
        {emailTemplateNotice && <p className="mt-1 text-amber-700">{emailTemplateNotice}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={checkSymbols} disabled={checkingSymbols} className="rounded border px-3 py-1 text-xs">{checkingSymbols ? "Ellenorzes..." : "Ticker-ek ellenorzese"}</button>
          <button onClick={() => void fetchEmailTemplates()} disabled={loadingTemplates} className="rounded border px-3 py-1 text-xs">{loadingTemplates ? "Frissites..." : "Template lista frissitese"}</button>
        </div>
        {symbolCheck.length > 0 && <div className="mt-2 space-y-1">{symbolCheck.map((line) => <p key={line}>{line}</p>)}</div>}
      </div>

      <button onClick={generateAll} disabled={loading} className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60">
        {loading ? "Composer fut..." : "Tartalom generalasa a valasztott template-ekbe"}
      </button>

      {status && <p className="text-sm text-slate-700">{status}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      )}

      {chartUrls.length > 0 && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-semibold text-brand-navy">Generalt chartok ({chartUrls.length})</p>
          {chartUrls.map((url) => (
            <div key={url} className="flex gap-2">
              <input readOnly value={url} className="w-full rounded border px-2 py-1 text-xs" />
              <a href={url} target="_blank" rel="noreferrer" className="rounded border px-3 py-1 text-xs">Megnyit</a>
            </div>
          ))}
        </div>
      )}

      {aiText && <textarea readOnly value={aiText} className="h-56 w-full rounded border p-2 text-sm" />}

      {pdfUrl && <p className="text-sm">PDF: <a href={pdfUrl} target="_blank" className="text-brand-teal underline">{pdfUrl}</a></p>}
      {emailHtml && <textarea readOnly value={emailHtml} className="h-72 w-full rounded border p-2 font-mono text-xs" />}
    </section>
  );
}



