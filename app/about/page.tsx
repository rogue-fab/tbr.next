import Link from "next/link";
import ContactForm from "../../components/ContactForm";

export const metadata = {
  title: "About & Disclosures | TubeBenderReviews",
  description:
    "Who runs TubeBenderReviews, how the scoring works, and how RogueFab fits into the picture.",
};

export default function AboutPage() {
  return (
    <main className="container mx-auto px-4 py-10 max-w-4xl">
      {/* Contact Form - Primary CTA */}
      <ContactForm />

      <div className="mt-12 space-y-8">
        <h1 className="text-3xl font-semibold mb-6">About & Disclosures</h1>

      <section className="mb-8 space-y-3">
        <h2 className="text-xl font-semibold">Who runs TubeBenderReviews</h2>
        <p className="text-sm text-muted-foreground">
          TubeBenderReviews is published by <strong>Joseph Gambino</strong> — a
          mechanical engineer and the founder of Rogue Fabrication (RogueFab).
          Yes, I own RogueFab. And yes, we make tube benders.
        </p>
        <p className="text-sm text-muted-foreground">
          This site exists because most tube bender "reviews" online are either
          thin marketing pieces or random forum opinions. I wanted a
          single place where you can compare all the major manual and hydraulic
          benders using one scoring system, with the rules written down in
          public.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="text-xl font-semibold">Ownership & conflicts of interest</h2>
        <p className="text-sm text-muted-foreground">
          I am the majority owner of Rogue Fabrication, LLC. That means I have a
          direct financial interest in one of the brands listed on this site.
          You should know that up front.
        </p>
        <p className="text-sm text-muted-foreground">
          To keep things honest, every brand (including RogueFab) is scored
          using the{" "}
          <Link href="/scoring" className="underline">
            same published 11-category, 100-point scoring framework
          </Link>
          . RogueFab does not get special categories, hidden weights, or
          "editor-only" bonuses. If a RogueFab product scores well, it&apos;s
          because it wins on the published criteria. If it doesn&apos;t, the
          score reflects that.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="text-xl font-semibold">How the scoring works</h2>
        <p className="text-sm text-muted-foreground">
          The scoring system is built around real specs and real trade-offs, not
          vague vibes. Each product is evaluated on things like:
        </p>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>Value for money (complete setup price bands)</li>
          <li>Max tube diameter and bend radius capability</li>
          <li>Country of origin and manufacturing</li>
          <li>Maximum bend angle</li>
          <li>Wall thickness capability (for 1.75&quot; DOM)</li>
          <li>Die selection and shapes</li>
          <li>Years in business and track record</li>
          <li>Upgrade path, modular clamping, and mandrel options</li>
          <li>S-bend capability and real-world flexibility</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          You can read the full scoring breakdown on the{" "}
          <Link href="/scoring" className="underline">
            Scoring Methodology
          </Link>{" "}
          page. The short version: there is one scoring model, it&apos;s
          transparent, and it applies to everyone.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="text-xl font-semibold">Data sources & corrections</h2>
        <p className="text-sm text-muted-foreground">
          Specs and pricing start from the manufacturers&apos; published data,
          then get normalized so you can compare apples to apples. On top of
          that, I maintain a private admin panel that lets me correct or update
          specs without redeploying the whole site.
        </p>
        <p className="text-sm text-muted-foreground">
          If you represent a brand and notice an error,{" "}
          <span className="font-medium">email me with documentation</span> and
          I&apos;ll fix it. I care much more about being correct than &quot;winning&quot;
          a comparison.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="text-xl font-semibold">Affiliate links & money</h2>
        <p className="text-sm text-muted-foreground">
          At the time of writing, this site does not take paid placement and
          does not accept &quot;pay to win&quot; deals from any brand. In the future,
          some outbound links may be affiliate links, which means the site could
          earn a small commission if you buy through them. If/when that happens,
          those links will be labeled clearly.
        </p>
      </section>

      <p className="text-xs text-muted-foreground">
        Last updated: {new Date().toISOString().split("T")[0]}
      </p>
      </div>
    </main>
  );
}
