import { ChartWorkspace } from "@/components/charts/chart-workspace";

export default function ChartsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-brand-navy">Financial Charting Automation</h1>
      <ChartWorkspace />
    </div>
  );
}
