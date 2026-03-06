import { EmailBuilderWorkspace } from "@/components/email-builder/email-builder-workspace";

export default function EmailBuilderPage() {
  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen px-6 xl:px-10">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <h1 className="text-2xl font-semibold text-brand-navy">Visual Email Builder</h1>
        <EmailBuilderWorkspace />
      </div>
    </div>
  );
}
