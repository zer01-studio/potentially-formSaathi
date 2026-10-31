import { Reveal } from "@/components/motion/reveal";

const PROBLEMS = [
  {
    number: "01",
    title: "Wording from another world",
    body: "“Please furnish…” turns a simple question into a puzzle. Most forms are written for clerks, not for the people filling them in.",
  },
  {
    number: "02",
    title: "Language shouldn’t be a barrier",
    body: "When a form isn’t in the language you think in, every field becomes a guess — and guesses cause mistakes.",
  },
  {
    number: "03",
    title: "The digital divide is real",
    body: "Tiny inputs, rigid formats, and nobody to ask when you get stuck. Low digital literacy shouldn’t cost you an application.",
  },
];

export function Problem() {
  return (
    <section className="border-y border-border/70 bg-card/40">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
              The problem
            </p>
            <h2 className="mt-4 font-display text-[2rem] font-medium leading-[1.08] tracking-[-0.02em] text-foreground sm:text-[2.6rem]">
              A form asks for facts. It shouldn’t demand{" "}
              <span className="italic text-accent-strong">fluency.</span>
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              One confusing line can hold up a passport, a scholarship, or a
              lease. FormSaathi meets people where they are.
            </p>
          </Reveal>

          <div className="space-y-7">
            {PROBLEMS.map((problem, index) => (
              <Reveal key={problem.number} delay={index * 0.06}>
                <div className="group grid grid-cols-[auto_1fr] gap-x-5 border-t border-border/70 pt-6">
                  <span className="font-mono text-[11px] tracking-[0.1em] text-accent-strong">
                    {problem.number}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-medium text-foreground">
                      {problem.title}
                    </h3>
                    <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                      {problem.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
