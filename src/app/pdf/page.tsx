import { PdfWorkspace } from "@/components/pdf/pdf-workspace";

export default function PdfPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-brand-navy">PDF Generation Module</h1>
      <PdfWorkspace />
    </div>
  );
}
