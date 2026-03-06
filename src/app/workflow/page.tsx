import { WorkflowWorkspace } from "@/components/workflow/workflow-workspace";

export default function WorkflowPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-brand-navy">One-Click Workflow</h1>
      <p className="text-sm text-slate-600">Chart(ok) -&gt; AI tartalom -&gt; PDF es/vagy Email export egyetlen futtatassal.</p>
      <WorkflowWorkspace />
    </div>
  );
}
