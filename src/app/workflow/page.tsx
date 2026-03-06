import { WorkflowWorkspace } from "@/components/workflow/workflow-workspace";

export default function WorkflowPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-brand-navy">Composer</h1>
      <p className="text-sm text-slate-600">AI tartalom + chartok + PDF es/vagy email generalas a valasztott template-ek alapjan.</p>
      <WorkflowWorkspace />
    </div>
  );
}
