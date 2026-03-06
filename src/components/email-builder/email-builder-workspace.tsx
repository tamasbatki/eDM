"use client";

import { useEffect, useRef, useState } from "react";

import { defaultEmailSnippets, defaultEmailTemplate } from "@/lib/design-defaults";
import { readWorkflowContext } from "@/lib/workflow-context";

type StarterBlocks = { cta: string; chart: string };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="font-family:Verdana, Helvetica, sans-serif; font-size:14px; line-height:1.65; color:#454547; margin:0 0 12px 0;">${escapeHtml(
          block,
        )}</p>`,
    )
    .join("");
}

export function EmailBuilderWorkspace() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null);
  const autoImportDoneRef = useRef(false);

  const [loadingEditor, setLoadingEditor] = useState(true);
  const [html, setHtml] = useState("");
  const [starterBlocks, setStarterBlocks] = useState<StarterBlocks>({
    cta: defaultEmailSnippets.cta,
    chart: defaultEmailSnippets.chart,
  });
  const [workflowNotice, setWorkflowNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;

    async function init() {
      if (!containerRef.current) return;

      const [{ default: grapesjs }, { default: newsletterPreset }] = await Promise.all([
        import("grapesjs"),
        import("grapesjs-preset-newsletter"),
      ]);

      if (disposed || !containerRef.current) return;

      const editor = grapesjs.init({
        container: containerRef.current,
        height: "78vh",
        fromElement: false,
        storageManager: {
          type: "local",
          autosave: true,
          autoload: true,
          stepsBeforeSave: 1,
          options: {
            local: {
              key: "condm-email-builder",
            },
          },
        },
        selectorManager: { componentFirst: true },
        panels: {
          defaults: [],
        },
        plugins: [newsletterPreset],
      });

      const existing = editor.getHtml();
      if (!existing || existing.trim().length < 20) {
        editor.setComponents(defaultEmailTemplate);
      }

      editorRef.current = editor;
      setLoadingEditor(false);
    }

    void init();

    return () => {
      disposed = true;
      editorRef.current?.destroy?.();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (loadingEditor || autoImportDoneRef.current) return;

    const from = new URLSearchParams(window.location.search).get("from");
    const forceImport = Boolean(from);
    importFromWorkflow(forceImport);
    autoImportDoneRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingEditor]);

  function insertHtmlSnippet(snippet: string) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.addComponents(snippet);
  }

  function insertToken(token: string) {
    insertHtmlSnippet(
      `<p style="font-family:Arial,Helvetica,sans-serif; font-size:14px; margin:0 0 10px 0;">${token}</p>`,
    );
  }

  function resetTemplate() {
    const editor = editorRef.current;
    if (!editor) return;

    editor.setComponents(defaultEmailTemplate);
    editor.setStyle("");
  }

  function importFromWorkflow(forceInsert = false) {
    const editor = editorRef.current;
    const context = readWorkflowContext();

    if (!editor) return;

    if (!context) {
      setWorkflowNotice("Nincs workflow adat az AI/Chart/PDF modulbol.");
      return;
    }

    const chartUrls = context.chartImageUrls ?? (context.chartImageUrl ? [context.chartImageUrl] : []);
    const firstChart = chartUrls[0] ?? "{{chart_image_url}}";

    const chartBlock = defaultEmailSnippets.chart.replaceAll("{{chart_image_url}}", firstChart);

    const ctaBlock = context.pdfUrl
      ? defaultEmailSnippets.cta.replaceAll("{{pdf_url}}", context.pdfUrl)
      : defaultEmailSnippets.cta;

    setStarterBlocks({ cta: ctaBlock, chart: chartBlock });

    const htmlNow = editor.getHtml() as string;
    const hasWorkflowBlock = htmlNow.includes("data-workflow-block=\"true\"");

    if (!context.aiText?.trim()) {
      setWorkflowNotice("Workflow blokkok frissitve (chart/CTA), AI szoveg nem elerheto.");
      return;
    }

    if (hasWorkflowBlock && !forceInsert) {
      setWorkflowNotice("Workflow tartalom mar be van illesztve az email builderbe.");
      return;
    }

    const title = context.sourceTitle ? escapeHtml(context.sourceTitle) : "AI altal generalt tartalom";
    const chartsHtml = chartUrls
      .map(
        (url) =>
          `<div style="margin:12px 0;"><img src="${url}" alt="Piaci grafikon" style="max-width:100%;height:auto;border:1px solid #E5E5E7;" /></div>`,
      )
      .join("");

    const contentBlock = `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;" data-workflow-block="true">
        <tr>
          <td style="padding:20px;">
            <h2 style="font-family:Verdana, Helvetica, sans-serif; font-size:20px; margin:0 0 12px 0; color:#454547;">${title}</h2>
            ${textToParagraphs(context.aiText)}
            ${chartsHtml}
            <div style="margin-top:14px;">${ctaBlock}</div>
          </td>
        </tr>
      </table>`;

    insertHtmlSnippet(contentBlock);
    setWorkflowNotice("Workflow tartalom beillesztve (AI + chartok + CTA). Ellenorizd, majd exportalj.");
  }

  async function copyExportToClipboard() {
    if (!html) return;
    await navigator.clipboard.writeText(html);
  }

  async function handleExport() {
    setError("");

    try {
      const editor = editorRef.current;
      if (!editor) {
        throw new Error("Editor has not initialized yet");
      }

      const exportHtml = `${editor.getHtml()}<style>${editor.getCss()}</style>`;

      const res = await fetch("/api/email/export-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: exportHtml }),
      });

      const json = (await res.json()) as {
        html?: string;
        starterBlocks?: StarterBlocks;
        error?: { message?: string };
      };

      if (!res.ok || !json.html) {
        throw new Error(json.error?.message ?? "Export failed");
      }

      setHtml(json.html);
      if (json.starterBlocks) {
        setStarterBlocks(json.starterBlocks);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-navy">Email Builder (GrapesJS)</p>
            <p className="text-xs text-slate-600">Default design + nagyitott szerkesztofelulet + autosave</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => importFromWorkflow(true)} className="rounded border px-3 py-1 text-xs">Workflow betoltes</button>
            <button onClick={resetTemplate} className="rounded border px-3 py-1 text-xs">Default design alkalmazasa</button>
            <button onClick={handleExport} className="rounded bg-brand-navy px-3 py-1 text-xs text-white">Ellenorzes + Export</button>
          </div>
        </div>
        {workflowNotice && <p className="mt-2 text-xs text-slate-600">{workflowNotice}</p>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="rounded-xl border bg-white p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            <button onClick={() => insertToken("{{client_name}}") } className="rounded border px-3 py-1 text-xs">+ client_name</button>
            <button onClick={() => insertToken("{{advisor_name}}") } className="rounded border px-3 py-1 text-xs">+ advisor_name</button>
            <button onClick={() => insertToken("{{portfolio_name}}") } className="rounded border px-3 py-1 text-xs">+ portfolio_name</button>
            <button onClick={() => insertToken("{{pdf_url}}") } className="rounded border px-3 py-1 text-xs">+ pdf_url</button>
            <button onClick={() => insertToken("{{chart_image_url}}") } className="rounded border px-3 py-1 text-xs">+ chart_image_url</button>
            <button onClick={() => insertHtmlSnippet(starterBlocks.chart)} className="rounded border px-3 py-1 text-xs">+ chart blokk</button>
            <button onClick={() => insertHtmlSnippet(starterBlocks.cta)} className="rounded border px-3 py-1 text-xs">+ CTA blokk</button>
          </div>

          {loadingEditor && <p className="p-4 text-sm text-slate-600">Editor betoltese...</p>}
          <div ref={containerRef} className="overflow-hidden rounded border" />
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border bg-white p-3">
            <p className="text-sm font-semibold text-brand-navy">Export panel</p>
            <div className="mt-3 flex gap-2">
              <button onClick={handleExport} className="rounded bg-brand-navy px-3 py-1 text-xs text-white">Export</button>
              <button onClick={copyExportToClipboard} disabled={!html} className="rounded border px-3 py-1 text-xs disabled:opacity-60">Masolas</button>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="rounded-xl border bg-white p-3">
            <p className="text-sm font-semibold text-brand-navy">Starter blokkok</p>
            <textarea readOnly value={starterBlocks.cta} className="mt-2 h-20 w-full rounded border p-2 font-mono text-xs" />
            <textarea readOnly value={starterBlocks.chart} className="mt-2 h-20 w-full rounded border p-2 font-mono text-xs" />
          </div>

          <div className="rounded-xl border bg-white p-3">
            <p className="text-sm font-semibold text-brand-navy">Exportalt HTML</p>
            <textarea readOnly value={html} className="mt-2 h-72 w-full rounded border p-2 font-mono text-xs" />
          </div>
        </aside>
      </div>
    </section>
  );
}
