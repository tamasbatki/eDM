"use client";

export interface WorkflowContext {
  aiText?: string;
  newsletterHtml?: string;
  chartImageUrl?: string;
  chartImageUrls?: string[];
  pdfUrl?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  updatedAt: string;
}

const WORKFLOW_CONTEXT_KEY = "condm-workflow-context-v1";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeChartUrls(rawArray: unknown, rawSingle: unknown): string[] {
  const fromArray = Array.isArray(rawArray)
    ? rawArray.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const fromSingle = typeof rawSingle === "string" && rawSingle.trim().length > 0 ? [rawSingle] : [];

  return Array.from(new Set([...fromArray, ...fromSingle]));
}

export function readWorkflowContext(): WorkflowContext | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(WORKFLOW_CONTEXT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) return null;

    const chartImageUrls = normalizeChartUrls(parsed.chartImageUrls, parsed.chartImageUrl);

    return {
      aiText: typeof parsed.aiText === "string" ? parsed.aiText : undefined,
      newsletterHtml: typeof parsed.newsletterHtml === "string" ? parsed.newsletterHtml : undefined,
      chartImageUrl: chartImageUrls[0],
      chartImageUrls,
      pdfUrl: typeof parsed.pdfUrl === "string" ? parsed.pdfUrl : undefined,
      sourceUrl: typeof parsed.sourceUrl === "string" ? parsed.sourceUrl : undefined,
      sourceTitle: typeof parsed.sourceTitle === "string" ? parsed.sourceTitle : undefined,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeWorkflowContext(partial: Omit<Partial<WorkflowContext>, "updatedAt">) {
  if (typeof window === "undefined") return;

  const existing = readWorkflowContext();
  const mergedChartUrls = normalizeChartUrls(
    partial.chartImageUrls ?? existing?.chartImageUrls,
    partial.chartImageUrl ?? existing?.chartImageUrl,
  );

  const merged: WorkflowContext = {
    ...(existing ?? { updatedAt: new Date().toISOString() }),
    ...partial,
    chartImageUrl: mergedChartUrls[0],
    chartImageUrls: mergedChartUrls,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(WORKFLOW_CONTEXT_KEY, JSON.stringify(merged));
}

export function appendWorkflowChart(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return;

  const existing = readWorkflowContext();
  writeWorkflowContext({
    chartImageUrls: Array.from(new Set([...(existing?.chartImageUrls ?? []), trimmed])),
    chartImageUrl: trimmed,
  });
}

export function clearWorkflowContext() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WORKFLOW_CONTEXT_KEY);
}
