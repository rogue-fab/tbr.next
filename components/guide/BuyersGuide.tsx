import Link from "next/link";

// Written buyer's guide. Grounded in the same criteria the site scores on, so
// the education and the ratings tell one consistent story. Plain shop language.

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {children}
      </div>
    </section>
  );
}

export default function BuyersGuide() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          How to choose a tube bender
        </h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          A rotary-draw tube bender is a long-term tool, and the sticker price is only part of the
          story. This guide walks through the specs that actually matter, how to match a machine to
          your work, and the traps to avoid — using the same criteria we score every machine on.
        </p>
      </header>

      <div className="mt-10 space-y-10">
        <Section id="capacity" title="1. Capacity: diameter and wall thickness">
          <p>
            The first two questions are <strong>how big</strong> and <strong>how thick</strong>. A
            machine&apos;s <em>max round-tube OD</em> tells you the largest tube it can run with
            catalog tooling — 1.5&quot;, 1.75&quot;, and 2.0&quot; are the common breakpoints, and
            2.5&quot;+ is heavy-duty territory. Buy for the largest tube you&apos;ll <em>actually</em>{" "}
            run, not the largest you can imagine.
          </p>
          <p>
            <strong>Wall thickness</strong> is the spec people forget, and it&apos;s where cheap
            machines quietly fall short. A frame rated for 0.120&quot; wall at 1.75&quot; DOM is a
            very different animal from one that can push 0.250&quot;. If a manufacturer doesn&apos;t
            publish a wall-thickness rating for a reference size, treat that as a red flag — we score
            a missing wall spec as zero rather than guess, and you should too.
          </p>
        </Section>

        <Section id="dies" title="2. Dies and tooling — the real long-term cost">
          <p>
            The frame is a one-time purchase; <strong>dies are forever</strong>. Every tube size and
            shape needs its own die, and a good die costs real money. Before you buy a frame, price
            out the dies for the sizes you run — a &quot;cheap&quot; bender with expensive or
            hard-to-get dies can cost more over five years than a pricier frame with an affordable,
            broad die library.
          </p>
          <p>
            Check the breadth of the die family too: round tube is a given, but do they offer{" "}
            <strong>pipe, square, EMT, and specialty shapes</strong>? A wide, in-stock die catalog
            means the machine grows with your work instead of boxing you in.
          </p>
        </Section>

        <Section id="angle" title="3. Bend angle and complex bends">
          <p>
            Most fabrication needs at least 90–120°, but roll cages, chassis, and headers routinely
            call for <strong>180°+</strong>. Look for the machine&apos;s published{" "}
            <em>maximum bend angle</em> — and if you do exhaust or chassis work, pay attention to{" "}
            <strong>true S-bend capability</strong>: two opposite bends with almost no straight
            between them. Marketing photos with several inches of straight tube between bends do{" "}
            <em>not</em> count; a real S-bend needs the geometry to nest tightly.
          </p>
        </Section>

        <Section id="mandrel" title="4. Mandrel bending: only if you need it">
          <p>
            A <strong>mandrel</strong> supports the tube from the inside so thin-wall and tight-radius
            bends don&apos;t wrinkle or collapse. If you&apos;re running thin wall, polished stainless,
            or tight-radius work where wrinkles are unacceptable, mandrel support matters a lot. If
            you&apos;re bending thicker DOM at generous radii, you may never need it — don&apos;t pay
            for capability you won&apos;t use.
          </p>
        </Section>

        <Section id="power" title="5. Power: manual, air/hydraulic, or electric/hydraulic">
          <p>
            <strong>Manual</strong> benders are affordable, portable, and great for lower-volume or
            smaller-diameter work — they just take muscle. <strong>Air/hydraulic</strong> and{" "}
            <strong>electric/hydraulic</strong> add speed, repeatability, and the grunt to push large
            diameters and heavy wall. The best frames offer an <em>upgrade path</em> — start manual,
            add power later — so check whether power is a bolt-on or a whole new machine.
          </p>
        </Section>

        <Section id="cost" title="6. Total system cost, not sticker price">
          <p>
            A tube bender is a <strong>system</strong>: frame + dies + power + a stand or base. The
            honest number is what it costs to walk away able to bend — and that&apos;s exactly how we
            compute value. A frame that looks cheap can end up expensive once you add the dies and a
            power unit; a pricier frame with included tooling can be the better buy. Add it all up
            before you decide.
          </p>
          <p>
            One trap to watch: a machine that <em>requires</em> a stand for safe use but whose maker
            doesn&apos;t sell one. That&apos;s a cost you&apos;ll pay whether it&apos;s on the invoice
            or not.
          </p>
        </Section>

        <Section id="origin" title="7. &quot;Made in USA&quot; — read it carefully">
          <p>
            Origin claims range from a flat, unqualified &quot;Made in USA&quot; to vague
            &quot;American-made&quot; marketing. What matters more than the slogan is{" "}
            <strong>whether the maker documents where each major component comes from</strong> —
            frame, dies, hydraulics, motor. A company that openly tells you the pump is imported is
            being more honest than one that stays silent, and that transparency is worth rewarding.
            When a maker doesn&apos;t disclose origin at all, treat it as unknown — not as a promise.
          </p>
        </Section>

        <Section id="match" title="Match the machine to your work">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Roll cages / chassis:</strong> prioritize 1.75&quot;+ capacity, 180°+ bend
              angle, true S-bend capability, and a solid power option.
            </li>
            <li>
              <strong>Exhaust / headers:</strong> mandrel support and tight-radius, wrinkle-free
              bends on thin wall matter most; S-bend capability is a big plus.
            </li>
            <li>
              <strong>Furniture / railing / general fab:</strong> a broad, affordable die library and
              easy setup usually beat raw capacity; manual power is often plenty.
            </li>
            <li>
              <strong>Production / repeatability:</strong> look at power, length/rotation indexing,
              and angle repeatability features — the &quot;upgrade path&quot; category.
            </li>
          </ul>
        </Section>
      </div>

      <div className="mt-12 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-6 text-center">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Ready to put numbers to it? Every machine is scored on these exact criteria — with the math
          and sources shown.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link
            href="/reviews"
            className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Compare the reviews
          </Link>
          <Link
            href="/scoring"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            How we score
          </Link>
        </div>
      </div>
    </div>
  );
}
