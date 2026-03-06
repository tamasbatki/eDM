import { AiWorkspace } from "@/components/ai/ai-workspace";

export default function AiPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-brand-navy">AI Text Generation Module</h1>
      <AiWorkspace />
    </div>
  );
}
