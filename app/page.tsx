"use client";

import Link from "next/link";
import Image from "next/image";
import { placeholderFor } from "@/lib/imagePlaceholders";
import type { CSSProperties } from "react";
import Media from "@/components/Media";
import Contours from "@/components/Contours";
import SectionHeading from "@/components/SectionHeading";
import { HOME, PROJECTS, ABOUT, LINKS } from "@/lib/content";

const Arrow = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function Home() {
  // The site's one orchestrated moment: the hero text rises in, under half a
  // second in all. Pure CSS (.hero-rise in globals.css), so it starts at first
  // paint, and reduced motion shows everything at once.
  const rise = (i: number) => ({ "--i": i }) as CSSProperties;

  return (
    <>
      {/* ---------------------------------------------------------------- HERO
          The foothills photograph, sharp and edge to edge. The text sits on
          the left, where a shade from the left edge keeps it readable. */}
      <section className="relative flex min-h-[88svh] items-center overflow-hidden bg-pine-deep text-paper">
        {HOME.heroImage && (
          <Image
            src={HOME.heroImage}
            alt="The Himalayan foothills near Bharog Baneri"
            fill
            priority
            sizes="100vw"
            placeholder={placeholderFor(HOME.heroImage) ? "blur" : "empty"}
            blurDataURL={placeholderFor(HOME.heroImage)?.blur}
            className="object-cover object-[50%_60%]"
          />
        )}
        {/* Wide screens: shade from the left edge only. Narrow screens: the
            text runs the full width, so the shade is even. */}
        <div
          aria-hidden
          className="absolute inset-0 hidden lg:block"
          style={{
            background:
              "linear-gradient(90deg, rgb(12 22 17 / 0.78) 0%, rgb(12 22 17 / 0.55) 42%, rgb(12 22 17 / 0.08) 75%)," +
              "linear-gradient(0deg, rgb(12 22 17 / 0.45) 0%, rgb(12 22 17 / 0) 35%)",
          }}
        />
        <div aria-hidden className="absolute inset-0 bg-[rgb(12_22_17/0.6)] lg:hidden" />

        <div className="container-rishi relative z-10 pb-16 pt-[calc(var(--header-h)+48px)]">
          <div className="max-w-2xl">
            <p style={rise(0)} className="hero-rise text-sm font-medium text-marigold-soft">
              {HOME.heroEyebrow}
            </p>
            <h1 className="mt-4 font-display text-6xl font-medium leading-[0.95] tracking-[-0.03em] sm:text-7xl lg:text-8xl">
              <span style={rise(1)} className="hero-rise block">
                {HOME.heroLine1} <span className="text-marigold">{HOME.heroLine2}</span>
              </span>
            </h1>
            <p style={rise(2)} className="hero-rise mt-6 max-w-lg text-lg leading-relaxed text-paper/85 sm:text-xl">
              {HOME.heroSub}
            </p>
            <div style={rise(3)} className="hero-rise mt-8 flex flex-wrap gap-3">
              <a href={LINKS.interestForm} target="_blank" rel="noopener noreferrer" className="btn-accent">
                Register your interest
              </a>
              <Link href="/about" className="btn-ghost-dark">
                Learn about us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- MISSION */}
      <section className="container-rishi py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading title={HOME.missionTitle} />
            <p className="mt-6 text-lg leading-relaxed text-ink/75">
              {HOME.missionBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/about" className="btn-primary">
                Our story
              </Link>
              <Link href="/projects" className="btn-ghost">
                Explore projects
              </Link>
            </div>
          </div>
          <Media
            src={HOME.missionImage}
            alt="Project RISHI members in the field"
            label="Mission / field photo"
            className="aspect-[4/3] w-full"
            rounded="rounded-2xl"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        {/* stats */}
        <dl className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-pine/10 bg-pine/10 sm:grid-cols-3">
          {HOME.stats.map((s) => (
            <div key={s.label} className="flex flex-col bg-paper px-8 py-8">
              <dt className="order-2 mt-2 text-sm text-ink/70">{s.label}</dt>
              <dd className="font-display text-5xl font-medium tabular-nums text-pine-deep">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------------ PROJECTS */}
      <section className="bg-pine-deep py-24 text-paper">
        <div className="container-rishi">
          <SectionHeading title="Four teams, one village" tone="dark" />
          <p className="mt-4 max-w-2xl text-paper/70">
            Our work in Bharog Baneri is carried out by four project teams, each
            tackling a different pillar of sustainable development.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {PROJECTS.map((p) => (
              <article key={p.slug}>
                <Link
                  href={`/projects/${p.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03] transition-colors duration-150 hover:border-paper/25 hover:bg-paper/[0.06]"
                >
                  <Media
                    src={p.image}
                    alt={p.name}
                    label={`${p.name} cover`}
                    className="aspect-[16/9] w-full"
                    rounded="rounded-none"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  <div className="flex items-start justify-between gap-6 p-6">
                    <div>
                      <h3 className="font-display text-2xl font-medium">{p.name}</h3>
                      <p className="mt-2 line-clamp-2 max-w-md text-sm text-paper/65">
                        {p.intro}
                      </p>
                    </div>
                    <span className="mt-2 shrink-0 text-paper/50 transition-colors duration-150 group-hover:text-marigold-soft">
                      <Arrow className="h-5 w-5" />
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- METHODOLOGY
          A real sequence, so it reads as one path rather than five cards. */}
      <section className="container-rishi py-24">
        <SectionHeading title={ABOUT.methodology.title} />
        <ol className="mt-12 grid overflow-hidden rounded-2xl border border-pine/10 sm:grid-cols-5">
          {ABOUT.methodology.steps.map((step, i) => (
            <li
              key={step}
              className="flex items-baseline gap-4 border-pine/10 px-6 py-6 [&:not(:first-child)]:border-t sm:flex-col sm:gap-8 sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-t-0"
            >
              <span className="font-mono text-sm tabular-nums text-ink/60">{i + 1}</span>
              <span className="font-display text-xl font-medium text-pine-deep">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ----------------------------------------------------------- GET INVOLVED */}
      <section className="container-rishi pb-24">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl bg-pine p-10 text-paper">
            <Contours className="absolute inset-0 h-full w-full text-paper" opacity={0.1} />
            <div className="relative z-10">
              <h3 className="font-display text-3xl font-medium">Join us</h3>
              <p className="mt-3 max-w-md text-paper/75">
                Applications are open now. We recruit at the start of every
                fall and spring semester.
              </p>
              <Link href="/apply" className="btn-accent mt-8">
                See recruitment dates
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-pine/10 bg-marigold/10 p-10">
            <h3 className="font-display text-3xl font-medium text-pine-deep">Become a donor</h3>
            <p className="mt-3 max-w-md text-ink/75">
              We appreciate donations of all sizes. They keep us running and
              directly support our work in Bharog Baneri.
            </p>
            <a href={LINKS.donate} className="btn-primary mt-8">
              Donate
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
