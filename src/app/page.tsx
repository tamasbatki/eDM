import Link from "next/link";

const cards = [
  {
    href: "/workflow",
    title: "Composer",
    description: "AI + chartok + PDF/Email generalas valasztott template-ekbe",
  },
  {
    href: "/email-builder",
    title: "Email Template Builder",
    description: "Kulon template szerkeszto email layoutok keszitesehez",
  },
  {
    href: "/charts",
    title: "Financial Charting",
    description: "Ticker -> OHLC -> branded chart image generation",
  },
  {
    href: "/ai",
    title: "AI Drafting & Summaries",
    description: "Instruction mode and URL summarization mode",
  },
  {
    href: "/pdf",
    title: "PDF Builder",
    description: "Template-based PDF generation via Puppeteer",
  },
];

export default function HomePage() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-brand-mist/70 bg-white/90 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-brand-navy">Phase 1 MVP Workspace</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Kulon template builder es kulon composer felulet chart, AI, PDF es email HTML kesziteshez. Sending, tracking es analytics intentionally out of scope.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-brand-mist bg-white/95 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-teal hover:shadow"
          >
            <h2 className="font-semibold text-brand-navy group-hover:text-brand-teal">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{card.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
