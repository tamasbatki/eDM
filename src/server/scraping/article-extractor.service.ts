import * as cheerio from "cheerio";

const MAX_EXTRACTED_CHARS = 18000;

export interface ArticleContent {
  title: string;
  text: string;
}

export function extractMainArticleTextFromHtml(html: string): string {
  const $ = cheerio.load(html);

  $("script, style, noscript, iframe").remove();

  const candidate = $("article").first().text().trim();
  const fallback = $("main").first().text().trim() || $("body").text().trim();
  const text = (candidate || fallback).replace(/\s+/g, " ").trim();

  if (!text) {
    throw new Error("No extractable article content found");
  }

  return text.slice(0, MAX_EXTRACTED_CHARS);
}

export function extractArticleContentFromHtml(html: string): ArticleContent {
  const $ = cheerio.load(html);
  const title =
    $("meta[property='og:title']").attr("content")?.trim() ||
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    "Concorde blog";

  const text = extractMainArticleTextFromHtml(html);
  return { title, text };
}

export async function extractArticleContent(url: string): Promise<ArticleContent> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  return extractArticleContentFromHtml(html);
}

export async function extractMainArticleText(url: string): Promise<string> {
  const content = await extractArticleContent(url);
  return content.text;
}

export const scrapingInternals = {
  MAX_EXTRACTED_CHARS,
};
