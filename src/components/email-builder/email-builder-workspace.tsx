"use client";

import { useEffect, useRef, useState } from "react";

import { defaultEmailSnippets, defaultEmailTemplate } from "@/lib/design-defaults";
import { readWorkflowContext, writeWorkflowContext } from "@/lib/workflow-context";

type StarterBlocks = { cta: string; chart: string };
type PreviewMode = "desktop" | "mobile";

type ExportResponse = {
  html?: string;
  starterBlocks?: StarterBlocks;
  error?: { message?: string };
};

type MjmlCompileError = {
  formattedMessage?: string;
  message?: string;
};

type MjmlCompileResult = {
  html?: string;
  errors?: MjmlCompileError[];
};

type TemplateSummary = {
  id: string;
  name: string;
  updatedAt: string;
};

type TemplateRecord = TemplateSummary & {
  mjml: string;
  createdAt: string;
};

type EmailAsset = {
  name: string;
  url: string;
  size: number;
  updatedAt: string;
};

type TemplateQaResult = {
  ok: boolean;
  normalizedMjml: string;
  errors: string[];
  warnings: string[];
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToMjml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) => `
        <mj-text padding="0 0 14px 0" font-size="14px" line-height="22px" color="#454547">
          ${escapeHtml(block).replace(/\n/g, "<br />")}
        </mj-text>
      `,
    )
    .join("");
}

function getDefaultStarterBlocks(context?: { pdfUrl?: string; chartImageUrl?: string }): StarterBlocks {
  return {
    cta: defaultEmailSnippets.cta.replaceAll("{{pdf_url}}", context?.pdfUrl ?? "{{pdf_url}}"),
    chart: defaultEmailSnippets.chart.replaceAll("{{chart_image_url}}", context?.chartImageUrl ?? "{{chart_image_url}}"),
  };
}

function getCustomEmailBlocks() {
  return [
    {
      id: "condm-hero",
      label: "Hero",
      category: "conDM Blocks",
      media: '<div style="font-size:12px;font-weight:700;color:#454547;">HERO</div>',
      content: `
        <mj-section background-color="#454547" padding="28px 30px 24px 30px">
          <mj-column>
            <mj-text color="#ffffff" font-size="28px" font-weight="700">Piaci osszefoglalo</mj-text>
            <mj-text color="#d8d8d8" padding-top="8px">Rovid vezeto bekezdes a hirlevel elejere.</mj-text>
            <mj-button align="left" background-color="#F18E00" color="#ffffff" href="{{pdf_url}}">Tovabbi reszletek</mj-button>
          </mj-column>
        </mj-section>
      `,
    },
    {
      id: "condm-article-card",
      label: "Article Card",
      category: "conDM Blocks",
      media: '<div style="font-size:12px;font-weight:700;color:#454547;">CARD</div>',
      content: `
        <mj-section padding="0 30px 20px 30px">
          <mj-column>
            <mj-text font-size="20px" font-weight="700" padding="0 0 10px 0">Cikk cim vagy temakor</mj-text>
            <mj-text padding="0 0 14px 0">Rovid bevezeto a cikk vagy elemzes tartalmahoz. Itt lehet egy erosebb roviditett kivonat.</mj-text>
            <mj-button align="left" background-color="#454547" color="#ffffff" href="#">Olvasas</mj-button>
          </mj-column>
        </mj-section>
      `,
    },
    {
      id: "condm-chart-highlight",
      label: "Chart Highlight",
      category: "conDM Blocks",
      media: '<div style="font-size:12px;font-weight:700;color:#454547;">CHART</div>',
      content: `
        <mj-section padding="0 30px 24px 30px">
          <mj-column>
            <mj-text font-size="18px" font-weight="700" padding="0 0 12px 0">Piaci grafikon kiemeles</mj-text>
            ${defaultEmailSnippets.chart}
            <mj-text padding="12px 0 0 0">Rovid chart magyarazat vagy megjegyzes.</mj-text>
          </mj-column>
        </mj-section>
      `,
    },
    {
      id: "condm-two-column-metrics",
      label: "2-Column Metrics",
      category: "conDM Blocks",
      media: '<div style="font-size:12px;font-weight:700;color:#454547;">2COL</div>',
      content: `
        <mj-section padding="0 30px 24px 30px">
          <mj-group>
            <mj-column background-color="#f8fafc" padding="16px">
              <mj-text font-size="12px" color="#808083">Mutato A</mj-text>
              <mj-text font-size="24px" font-weight="700">+4.8%</mj-text>
            </mj-column>
            <mj-column background-color="#f8fafc" padding="16px">
              <mj-text font-size="12px" color="#808083">Mutato B</mj-text>
              <mj-text font-size="24px" font-weight="700">1,245 bp</mj-text>
            </mj-column>
          </mj-group>
        </mj-section>
      `,
    },
    {
      id: "condm-cta-strip",
      label: "CTA Strip",
      category: "conDM Blocks",
      media: '<div style="font-size:12px;font-weight:700;color:#454547;">CTA</div>',
      content: `
        <mj-section background-color="#fff7ed" padding="18px 30px">
          <mj-group>
            <mj-column width="65%">
              <mj-text font-size="18px" font-weight="700">Szeretnel teljes riportot?</mj-text>
              <mj-text padding-top="6px">Tedd be ide a legfontosabb kovetkezo lepest.</mj-text>
            </mj-column>
            <mj-column width="35%">
              ${defaultEmailSnippets.cta}
            </mj-column>
          </mj-group>
        </mj-section>
      `,
    },
    {
      id: "condm-disclaimer-footer",
      label: "Disclaimer Footer",
      category: "conDM Blocks",
      media: '<div style="font-size:12px;font-weight:700;color:#454547;">LEGAL</div>',
      content: `
        <mj-section background-color="#f8fafc" padding="20px 30px">
          <mj-column>
            <mj-text font-size="11px" color="#6b7280" line-height="18px">
              Ez tajekoztato jellegu anyag, nem minosul befektetesi tanacsnak vagy ajanlattal egyenerteku kozlesnek.
            </mj-text>
            <mj-text font-size="11px" color="#9ca3af" padding-top="10px">conDM | {{advisor_name}}</mj-text>
          </mj-column>
        </mj-section>
      `,
    },
  ];
}

function configureRichTextEditor(editor: any, onHint: (message: string) => void) {
  const rte = editor.RichTextEditor;
  const actions = [
    { name: "condm-bold", icon: "<b>B</b>", attributes: { title: "Bold" }, result: (activeRte: any) => activeRte.exec("bold") },
    { name: "condm-italic", icon: "<i>I</i>", attributes: { title: "Italic" }, result: (activeRte: any) => activeRte.exec("italic") },
    { name: "condm-underline", icon: "<u>U</u>", attributes: { title: "Underline" }, result: (activeRte: any) => activeRte.exec("underline") },
    { name: "condm-h2", icon: "H2", attributes: { title: "Heading" }, result: (activeRte: any) => activeRte.exec("formatBlock", "h2") },
    { name: "condm-p", icon: "P", attributes: { title: "Paragraph" }, result: (activeRte: any) => activeRte.exec("formatBlock", "p") },
    { name: "condm-ul", icon: "• List", attributes: { title: "Bulleted list" }, result: (activeRte: any) => activeRte.exec("insertUnorderedList") },
    {
      name: "condm-link",
      icon: "Link",
      attributes: { title: "Link" },
      result: (activeRte: any) => {
        const selected = activeRte.selection();
        const href = window.prompt("Link URL", "https://");
        if (!href) return;
        activeRte.insertHTML(`<a href="${href}">${selected || href}</a>`);
      },
    },
  ];

  actions.forEach((action) => {
    if (!rte.get(action.name)) {
      rte.add(action.name, action);
    }
  });

  editor.on("rte:enable", () => onHint("Rich text mod: duplaklikk a szovegre, majd hasznald a toolbar gombjait kiemeleshez, listahoz vagy linkhez."));
  editor.on("rte:disable", () => onHint(""));
}

function registerCustomBlocks(editor: any) {
  const blockManager = editor.Blocks;
  getCustomEmailBlocks().forEach((block) => {
    if (!blockManager.get(block.id)) {
      blockManager.add(block.id, block);
    }
  });
}

export function EmailBuilderWorkspace() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const blockPanelRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null);
  const autoImportDoneRef = useRef(false);
  const previewTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loadingEditor, setLoadingEditor] = useState(true);
  const [exportedHtml, setExportedHtml] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [starterBlocks, setStarterBlocks] = useState<StarterBlocks>(() => getDefaultStarterBlocks());
  const [workflowNotice, setWorkflowNotice] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const [templateNotice, setTemplateNotice] = useState("");
  const [previewNotice, setPreviewNotice] = useState("");
  const [richTextNotice, setRichTextNotice] = useState("");
  const [assetNotice, setAssetNotice] = useState("");
  const [error, setError] = useState("");
  const [qaResult, setQaResult] = useState<TemplateQaResult | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("Uj hirlevel sablon");
  const [assets, setAssets] = useState<EmailAsset[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [uploadingAssets, setUploadingAssets] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function init() {
      if (!containerRef.current || !blockPanelRef.current) return;

      const [{ default: grapesjs }, { default: grapesJSMJML }] = await Promise.all([
        import("grapesjs"),
        import("grapesjs-mjml"),
      ]);

      if (disposed || !containerRef.current || !blockPanelRef.current) return;

      const editor = grapesjs.init({
        container: containerRef.current,
        fromElement: false,
        height: "76vh",
        width: "auto",
        storageManager: {
          type: "local",
          autosave: true,
          autoload: true,
          stepsBeforeSave: 1,
          options: { local: { key: "condm-email-builder-mjml" } },
        },
        selectorManager: { componentFirst: true },
        blockManager: { appendTo: blockPanelRef.current },
        assetManager: { assets: [] },
        deviceManager: {
          devices: [
            { id: "desktop", name: "Desktop", width: "" },
            { id: "mobile", name: "Mobile", width: "375px", widthMedia: "480px" },
          ],
        },
        plugins: [grapesJSMJML],
        pluginsOpts: {
          [grapesJSMJML as unknown as string]: {
            resetBlocks: true,
            resetDevices: true,
            resetStyleManager: true,
            overwriteExport: false,
          },
        },
      });

      registerCustomBlocks(editor);
      configureRichTextEditor(editor, setRichTextNotice);

      editor.on("update", () => {
        setQaResult(null);
        if (previewTimeoutRef.current) {
          window.clearTimeout(previewTimeoutRef.current);
        }
        previewTimeoutRef.current = window.setTimeout(() => {
          void refreshPreview(editor);
        }, 500);
      });

      const existing = String(editor.getHtml?.() ?? "").trim();
      if (!existing || existing.length < 20) {
        editor.setComponents(defaultEmailTemplate);
      }

      editorRef.current = editor;
      setLoadingEditor(false);
    }

    void init();

    return () => {
      disposed = true;
      if (previewTimeoutRef.current) {
        window.clearTimeout(previewTimeoutRef.current);
      }
      editorRef.current?.destroy?.();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    void refreshTemplates();
    void refreshAssets();
  }, []);

  useEffect(() => {
    if (loadingEditor || autoImportDoneRef.current) return;
    const from = new URLSearchParams(window.location.search).get("from");
    importFromWorkflow(Boolean(from));
    autoImportDoneRef.current = true;
    void refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingEditor]);

  useEffect(() => {
    syncAssetsToEditor(assets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  function syncAssetsToEditor(assetList: EmailAsset[]) {
    const editor = editorRef.current;
    if (!editor) return;

    const manager = editor.AssetManager;
    assetList.forEach((asset) => {
      if (!manager.get(asset.url)) {
        manager.add({ src: asset.url, name: asset.name, type: "image" });
      }
    });
  }

  async function refreshTemplates() {
    setLoadingTemplates(true);
    setTemplateNotice("");
    try {
      const res = await fetch("/api/email/templates", { cache: "no-store" });
      const json = (await res.json()) as { templates?: TemplateSummary[]; error?: { message?: string } };
      if (!res.ok || !json.templates) throw new Error(json.error?.message ?? "Template lista betoltese sikertelen.");
      const templateList = json.templates;
      setTemplates(templateList);
      if (templateList.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(templateList[0].id);
        setTemplateName((current) => current || templateList[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function refreshAssets() {
    setLoadingAssets(true);
    setAssetNotice("");
    try {
      const res = await fetch("/api/email/assets", { cache: "no-store" });
      const json = (await res.json()) as { assets?: EmailAsset[]; error?: { message?: string } };
      if (!res.ok || !json.assets) throw new Error(json.error?.message ?? "Asset lista betoltese sikertelen.");
      setAssets(json.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoadingAssets(false);
    }
  }

  async function runTemplateQa() {
    const editor = editorRef.current;
    if (!editor) return;

    setQaLoading(true);
    setError("");

    try {
      const mjml = editor.runCommand("mjml-code") as string;
      const res = await fetch("/api/email/templates/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mjml }),
      });

      const json = (await res.json()) as Partial<TemplateQaResult> & { error?: { message?: string; details?: { errors?: string[]; warnings?: string[] } } };

      if (res.ok) {
        setQaResult({
          ok: true,
          normalizedMjml: json.normalizedMjml ?? mjml,
          errors: json.errors ?? [],
          warnings: json.warnings ?? [],
        });
        setTemplateNotice("Template QA sikeres.");
        return;
      }

      setQaResult({
        ok: false,
        normalizedMjml: json.normalizedMjml ?? mjml,
        errors: json.error?.details?.errors ?? (json.error?.message ? [json.error.message] : ["Template QA sikertelen."]),
        warnings: json.error?.details?.warnings ?? [],
      });
      setError(json.error?.message ?? "Template QA sikertelen.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setQaLoading(false);
    }
  }

  async function uploadAssets(files: FileList | null) {
    if (!files?.length) return;
    setUploadingAssets(true);
    setAssetNotice("");
    setError("");

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));

      const res = await fetch("/api/email/assets", { method: "POST", body: formData });
      const json = (await res.json()) as { assets?: EmailAsset[]; error?: { message?: string } };
      if (!res.ok || !json.assets) throw new Error(json.error?.message ?? "Asset feltoltes sikertelen.");

      setAssets((current) => {
        const merged = [...json.assets!, ...current].filter(
          (asset, index, list) => list.findIndex((item) => item.url === asset.url) === index,
        );
        return merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
      setAssetNotice(`${json.assets.length} kep feltoltve.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setUploadingAssets(false);
    }
  }

  function insertMjmlSnippet(snippet: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.addComponents(snippet);
  }

  function insertToken(token: string) {
    insertMjmlSnippet(`
      <mj-text padding="0 0 12px 0" font-size="14px" line-height="22px" color="#454547">
        ${token}
      </mj-text>
    `);
  }

  function insertAsset(asset: EmailAsset) {
    insertMjmlSnippet(`
      <mj-section padding="0 30px 20px 30px">
        <mj-column>
          <mj-image src="${asset.url}" alt="${escapeHtml(asset.name)}" padding="0" fluid-on-mobile="true" />
        </mj-column>
      </mj-section>
    `);
    setAssetNotice(`Kep beszurva: ${asset.name}`);
  }

  async function copyAssetUrl(asset: EmailAsset) {
    await navigator.clipboard.writeText(asset.url);
    setAssetNotice(`Asset URL masolva: ${asset.name}`);
  }

  function openAssetManager() {
    const editor = editorRef.current;
    if (!editor) return;
    editor.runCommand("open-assets");
  }

  function resetTemplate() {
    const editor = editorRef.current;
    if (!editor) return;
    editor.setComponents(defaultEmailTemplate);
    setSelectedTemplateId("");
    setTemplateName("Uj hirlevel sablon");
    setWorkflowNotice("Default MJML template visszaallitva.");
    setTemplateNotice("");
    setExportNotice("");
    setPreviewNotice("");
    setQaResult(null);
    setError("");
    void refreshPreview();
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
    setStarterBlocks(getDefaultStarterBlocks({ pdfUrl: context.pdfUrl, chartImageUrl: firstChart }));

    if (!context.aiText?.trim()) {
      setWorkflowNotice("Workflow blokkok frissitve, de AI szoveg nem erheto el.");
      return;
    }

    const htmlNow = String(editor.getHtml?.() ?? "");
    if (htmlNow.includes('css-class="condm-workflow-block"') && !forceInsert) {
      setWorkflowNotice("Workflow tartalom mar be van illesztve az editorba.");
      return;
    }

    const title = context.sourceTitle ? escapeHtml(context.sourceTitle) : "AI altal generalt tartalom";
    const chartsMjml = chartUrls
      .map((url) => `
          <mj-image src="${escapeHtml(url)}" alt="Piaci grafikon" padding="0 0 16px 0" fluid-on-mobile="true" border="1px solid #E5E5E7" />
        `)
      .join("");

    const ctaHref = context.pdfUrl ? escapeHtml(context.pdfUrl) : "{{pdf_url}}";
    insertMjmlSnippet(`
      <mj-section padding="0 30px 0 30px" css-class="condm-workflow-block">
        <mj-column>
          <mj-divider border-color="#E5E5E7" border-width="1px" padding="0 0 24px 0" />
          <mj-text padding="0 0 12px 0" font-size="22px" font-weight="700" color="#454547">${title}</mj-text>
          ${textToMjml(context.aiText)}
          ${chartsMjml}
          <mj-button align="left" background-color="#F18E00" color="#ffffff" font-size="14px" border-radius="4px" inner-padding="14px 22px" href="${ctaHref}">Reszletes PDF</mj-button>
        </mj-column>
      </mj-section>
    `);
    setWorkflowNotice("Workflow tartalom beillesztve az email editorba.");
    void refreshPreview();
  }

  async function loadSelectedTemplate() {
    if (!selectedTemplateId) return;
    setLoadingTemplate(true);
    setTemplateNotice("");
    setError("");
    try {
      const res = await fetch(`/api/email/templates/${selectedTemplateId}`, { cache: "no-store" });
      const json = (await res.json()) as { template?: TemplateRecord; error?: { message?: string } };
      if (!res.ok || !json.template) throw new Error(json.error?.message ?? "Template betoltese sikertelen.");
      const editor = editorRef.current;
      if (!editor) throw new Error("Editor has not initialized yet");
      editor.setComponents(json.template.mjml);
      setTemplateName(json.template.name);
      setTemplateNotice(`Template betoltve: ${json.template.name}`);
      setQaResult(null);
      await refreshPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoadingTemplate(false);
    }
  }

  async function saveTemplate() {
    const editor = editorRef.current;
    if (!editor) return;
    const trimmedName = templateName.trim();
    if (!trimmedName) {
      setError("Adj nevet a template-nek mentes elott.");
      return;
    }

    setSavingTemplate(true);
    setTemplateNotice("");
    setError("");
    try {
      const mjml = editor.runCommand("mjml-code") as string;
      const res = await fetch("/api/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTemplateId || undefined, name: trimmedName, mjml }),
      });
      const json = (await res.json()) as { template?: TemplateRecord; error?: { message?: string } };
      if (!res.ok || !json.template) throw new Error(json.error?.message ?? "Template mentese sikertelen.");
      setSelectedTemplateId(json.template.id);
      setTemplateName(json.template.name);
      setTemplateNotice(`Template elmentve: ${json.template.name}`);
      await refreshTemplates();
      await runTemplateQa();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSavingTemplate(false);
    }
  }

  function compileCurrentHtml(editorInstance?: any): MjmlCompileResult {
    const editor = editorInstance ?? editorRef.current;
    if (!editor) throw new Error("Editor has not initialized yet");
    const mjml = editor.runCommand("mjml-code") as string;
    return editor.runCommand("mjml-code-to-html", { mjml }) as MjmlCompileResult;
  }

  async function refreshPreview(editorInstance?: any) {
    setError("");
    setPreviewNotice("");
    try {
      const compileResult = compileCurrentHtml(editorInstance);
      if (!compileResult?.html) throw new Error("Az MJML preview forditas nem adott HTML kimenetet.");
      setPreviewHtml(compileResult.html);
      const compileWarnings = (compileResult.errors ?? []).map((item) => item.formattedMessage ?? item.message ?? "").filter(Boolean);
      setPreviewNotice(compileWarnings.length ? `Preview frissult, az MJML ${compileWarnings.length} figyelmeztetest adott.` : "Preview frissitve.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }

  async function copyExportToClipboard() {
    if (!exportedHtml) return;
    await navigator.clipboard.writeText(exportedHtml);
    setExportNotice("Exportalt HTML a clipboardra masolva.");
  }

  async function handleExport() {
    setError("");
    setExportNotice("");
    try {
      const compileResult = compileCurrentHtml();
      if (!compileResult?.html) throw new Error("Az MJML forditas nem adott HTML kimenetet.");
      const res = await fetch("/api/email/export-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: compileResult.html }),
      });
      const json = (await res.json()) as ExportResponse;
      if (!res.ok || !json.html) throw new Error(json.error?.message ?? "Export failed");
      setExportedHtml(json.html);
      setPreviewHtml(json.html);
      writeWorkflowContext({ newsletterHtml: json.html });
      const compileWarnings = (compileResult.errors ?? []).map((item) => item.formattedMessage ?? item.message ?? "").filter(Boolean);
      setExportNotice(compileWarnings.length ? `Export keszult, de az MJML ${compileWarnings.length} figyelmeztetest adott.` : "Email HTML export sikeres.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border bg-white/95 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-brand-navy">Email Editor (MJML + GrapesJS)</p>
            <p className="max-w-3xl text-xs text-slate-600">Drag-and-drop email szerkeszto MJML exporttal. Szoveg szerkeszteshez kattints duplan egy text blokkra, ekkor megjelenik az alap rich text toolbar.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => importFromWorkflow(true)} className="rounded border px-3 py-1 text-xs">Workflow betoltes</button>
            <button onClick={resetTemplate} className="rounded border px-3 py-1 text-xs">Template reset</button>
            <button onClick={() => void runTemplateQa()} className="rounded border px-3 py-1 text-xs">Template ellenorzese</button>
            <button onClick={() => void refreshPreview()} className="rounded border px-3 py-1 text-xs">Preview frissites</button>
            <button onClick={handleExport} className="rounded bg-brand-navy px-3 py-1 text-xs text-white">HTML export</button>
          </div>
        </div>
        {workflowNotice && <p className="mt-3 text-xs text-slate-600">{workflowNotice}</p>}
        {templateNotice && <p className="mt-1 text-xs text-emerald-700">{templateNotice}</p>}
        {assetNotice && <p className="mt-1 text-xs text-emerald-700">{assetNotice}</p>}
        {richTextNotice && <p className="mt-1 text-xs text-amber-700">{richTextNotice}</p>}
        {previewNotice && <p className="mt-1 text-xs text-sky-700">{previewNotice}</p>}
        {exportNotice && <p className="mt-1 text-xs text-emerald-700">{exportNotice}</p>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_1fr_360px]">
        <aside className="space-y-3">
          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-brand-navy">Block library</p>
            <p className="mt-1 text-xs text-slate-600">Sajat newsletter blokkok + az MJML plugin alap blokkjaibol epulo konyvtar.</p>
            <div ref={blockPanelRef} className="condm-blocks mt-3 min-h-[20rem]" />
          </div>

          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-brand-navy">Asset library</p>
              <button onClick={openAssetManager} className="rounded border px-2 py-1 text-xs">Asset modal</button>
            </div>
            <p className="mt-1 text-xs text-slate-600">Kepfeltoltes es media tar email elemekhez.</p>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={(e) => void uploadAssets(e.target.files)} className="mt-3 block w-full text-xs" />
            <div className="mt-3 flex gap-2">
              <button onClick={() => void refreshAssets()} disabled={loadingAssets} className="rounded border px-3 py-1 text-xs disabled:opacity-60">{loadingAssets ? "Frissites..." : "Lista frissitese"}</button>
              <span className="text-xs text-slate-500">{uploadingAssets ? "Feltoltes folyamatban..." : `${assets.length} asset`}</span>
            </div>
            <div className="mt-3 grid gap-3">
              {assets.map((asset) => (
                <div key={asset.url} className="rounded-xl border p-2">
                  <img src={asset.url} alt={asset.name} className="h-24 w-full rounded object-cover" />
                  <p className="mt-2 truncate text-xs font-semibold text-brand-navy">{asset.name}</p>
                  <p className="text-[11px] text-slate-500">{Math.round(asset.size / 1024)} KB</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => insertAsset(asset)} className="rounded border px-2 py-1 text-[11px]">Beszuras</button>
                    <button onClick={() => void copyAssetUrl(asset)} className="rounded border px-2 py-1 text-[11px]">URL masolas</button>
                  </div>
                </div>
              ))}
              {!loadingAssets && assets.length === 0 && <p className="text-xs text-slate-500">Meg nincs feltoltott kep.</p>}
            </div>
          </div>
        </aside>

        <div className="rounded-2xl border bg-white p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap gap-2">
            <button onClick={() => insertToken("{{client_name}}") } className="rounded border px-3 py-1 text-xs">+ client_name</button>
            <button onClick={() => insertToken("{{advisor_name}}") } className="rounded border px-3 py-1 text-xs">+ advisor_name</button>
            <button onClick={() => insertToken("{{portfolio_name}}") } className="rounded border px-3 py-1 text-xs">+ portfolio_name</button>
            <button onClick={() => insertToken("{{pdf_url}}") } className="rounded border px-3 py-1 text-xs">+ pdf_url</button>
            <button onClick={() => insertToken("{{chart_image_url}}") } className="rounded border px-3 py-1 text-xs">+ chart_image_url</button>
            <button onClick={() => insertMjmlSnippet(starterBlocks.chart)} className="rounded border px-3 py-1 text-xs">+ chart blokk</button>
            <button onClick={() => insertMjmlSnippet(starterBlocks.cta)} className="rounded border px-3 py-1 text-xs">+ CTA blokk</button>
          </div>
          {loadingEditor && <p className="p-4 text-sm text-slate-600">Editor betoltese...</p>}
          <div ref={containerRef} className="overflow-hidden rounded-xl border" />
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-brand-navy">Template tarolo</p>
            <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template neve" className="mt-2 w-full rounded border px-3 py-2 text-sm" />
            <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="mt-2 w-full rounded border px-3 py-2 text-sm">
              <option value="">Valassz elmentett template-et</option>
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={saveTemplate} disabled={savingTemplate || loadingEditor} className="rounded bg-brand-navy px-3 py-1 text-xs text-white disabled:opacity-60">{savingTemplate ? "Mentes..." : selectedTemplateId ? "Template frissitese" : "Template mentese"}</button>
              <button onClick={loadSelectedTemplate} disabled={!selectedTemplateId || loadingTemplate || loadingEditor} className="rounded border px-3 py-1 text-xs disabled:opacity-60">{loadingTemplate ? "Betoltes..." : "Template betoltese"}</button>
              <button onClick={() => void refreshTemplates()} disabled={loadingTemplates} className="rounded border px-3 py-1 text-xs disabled:opacity-60">{loadingTemplates ? "Frissites..." : "Lista frissitese"}</button>
            </div>
            <p className="mt-2 text-xs text-slate-600">A template-ek szerveroldalon MJML-kent mentodnek, nem csak lokalis browser state-ben.</p>
          </div>

          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-brand-navy">Template QA</p>
              <button onClick={() => void runTemplateQa()} disabled={qaLoading || loadingEditor} className="rounded border px-3 py-1 text-xs disabled:opacity-60">{qaLoading ? "Ellenorzes..." : "Ellenorzes futtatasa"}</button>
            </div>
            {!qaResult && <p className="mt-2 text-xs text-slate-600">Mentés előtt érdemes lefuttatni az MJML szerkezeti ellenőrzést.</p>}
            {qaResult && (
              <div className="mt-2 space-y-3 text-xs">
                <p className={qaResult.ok ? "text-emerald-700" : "text-red-700"}>{qaResult.ok ? "A template valid." : "A template hibas."}</p>
                <div>
                  <p className="font-semibold text-brand-navy">Hibak</p>
                  {qaResult.errors.length > 0 ? qaResult.errors.map((item) => <p key={item} className="mt-1 text-red-700">{item}</p>) : <p className="mt-1 text-slate-500">Nincs kritikus hiba.</p>}
                </div>
                <div>
                  <p className="font-semibold text-brand-navy">Figyelmeztetesek</p>
                  {qaResult.warnings.length > 0 ? qaResult.warnings.map((item) => <p key={item} className="mt-1 text-amber-700">{item}</p>) : <p className="mt-1 text-slate-500">Nincs figyelmeztetes.</p>}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-brand-navy">Email preview</p>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setPreviewMode("desktop")} className={`rounded border px-3 py-1 ${previewMode === "desktop" ? "bg-brand-navy text-white" : ""}`}>Desktop</button>
                <button onClick={() => setPreviewMode("mobile")} className={`rounded border px-3 py-1 ${previewMode === "mobile" ? "bg-brand-navy text-white" : ""}`}>Mobile</button>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-600">Ez a forditott email HTML iframe preview-ja, kulon a canvas editor mellett.</p>
            <div className="mt-3 rounded-xl border bg-slate-100 p-3">
              <div className={`mx-auto overflow-hidden rounded-lg bg-white shadow ${previewMode === "mobile" ? "w-[375px] max-w-full" : "w-full"}`}>
                <iframe title="Email preview" srcDoc={previewHtml} className="h-[28rem] w-full bg-white" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-brand-navy">Export panel</p>
            <p className="mt-1 text-xs text-slate-600">A szerkesztoben MJML fut, exportnal email HTML jon ki.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={handleExport} className="rounded bg-brand-navy px-3 py-1 text-xs text-white">Export</button>
              <button onClick={copyExportToClipboard} disabled={!exportedHtml} className="rounded border px-3 py-1 text-xs disabled:opacity-60">Masolas</button>
            </div>
          </div>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-brand-navy">Starter blokkok</p>
            <textarea readOnly value={starterBlocks.cta} className="mt-2 h-24 w-full rounded border p-2 font-mono text-xs" />
            <textarea readOnly value={starterBlocks.chart} className="mt-2 h-24 w-full rounded border p-2 font-mono text-xs" />
          </div>

          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-brand-navy">Exportalt HTML</p>
            <textarea readOnly value={exportedHtml} className="mt-2 h-[18rem] w-full rounded border p-2 font-mono text-xs" />
          </div>
        </aside>
      </div>
    </section>
  );
}
