import { ChartJSNodeCanvas } from "chartjs-node-canvas";

import { defaultChartDesign } from "@/lib/design-defaults";

import { getBrandTokens } from "../branding";
import { createTimestampedName, saveBinaryToPublicDir } from "../storage/file-storage.service";

type Point = { timestamp: string; close: number };
export type ChartVariant = "close-area" | "close-line";

export interface GenerateChartInput {
  symbol: string;
  range: string;
  points: Point[];
  benchmarkSymbol?: string;
  benchmarkPoints?: Point[];
  variant?: ChartVariant;
}

const canvas = new ChartJSNodeCanvas({ width: 1200, height: 628, backgroundColour: "white" });

export async function generateFinancialChartImage(input: GenerateChartInput): Promise<string> {
  if (!input.points.length) {
    throw new Error("No price data provided for chart rendering");
  }

  const tokens = getBrandTokens();
  const variant = input.variant ?? "close-area";
  const hasBenchmark =
    Boolean(input.benchmarkSymbol) &&
    Boolean(input.benchmarkPoints?.length) &&
    input.benchmarkPoints!.length === input.points.length;

  const image = await canvas.renderToBuffer({
    type: "line",
    data: {
      labels: input.points.map((p) =>
        new Date(p.timestamp).toLocaleDateString("hu-HU", {
          month: "short",
          day: "numeric",
          year: "2-digit",
        }),
      ),
      datasets: [
        {
          label: `${input.symbol.toUpperCase()} zaro`,
          data: input.points.map((p) => p.close),
          borderColor: defaultChartDesign.lineColor,
          backgroundColor: defaultChartDesign.fillColor,
          fill: variant === "close-area",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.22,
        },
        ...(hasBenchmark
          ? [
              {
                label: `${input.benchmarkSymbol!.toUpperCase()} benchmark`,
                data: input.benchmarkPoints!.map((p) => p.close),
                borderColor: defaultChartDesign.benchmarkColor,
                borderWidth: 2,
                pointRadius: 0,
                borderDash: [5, 4],
                tension: 0.15,
              },
            ]
          : []),
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: `${input.symbol.toUpperCase()} arfolyam alakulasa`,
          color: defaultChartDesign.titleColor,
          font: { size: 24, weight: "bold", family: defaultChartDesign.fontFamily },
        },
        legend: { display: hasBenchmark },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 8,
            color: defaultChartDesign.axisTextColor,
            font: { family: defaultChartDesign.fontFamily },
          },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: defaultChartDesign.axisTextColor,
            callback: (value) => `${Number(value).toFixed(2)} USD`,
            font: { family: tokens.typography.sans },
          },
          grid: { color: defaultChartDesign.gridColor },
        },
      },
    },
  });

  const fileName = createTimestampedName(
    [input.symbol, input.range, variant, "chart"],
    "png",
  );

  return saveBinaryToPublicDir("generated/charts", fileName, image);
}
