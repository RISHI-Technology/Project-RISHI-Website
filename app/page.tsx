"use client";

import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { placeholderFor } from "@/lib/imagePlaceholders";
import Media from "@/components/Media";
import SectionHeading from "@/components/SectionHeading";
import SiteLabel from "@/components/SiteLabel";
import { HOME, PROJECTS, ABOUT, LINKS } from "@/lib/content";

const Arrow = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function Home() {
  // The site's one orchestrated moment: the type rises in (.hero-rise,
  // globals.css), the photo is revealed top-down (app/site.css). All CSS, so it starts at first paint; reduced
  // motion shows everything at once.
  const rise = (i: number) => ({ "--i": i }) as CSSProperties;

  return (
    <div className="site">
      {/* ---------------------------------------------------------------- HERO */}
      <section className="bg-page pt-[var(--header-h)]">
        <div className="grid lg:min-h-[calc(100svh-var(--header-h))] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
          <div className="s-bleed-left flex flex-col justify-center pb-14 pr-[var(--gutter)] pt-14 lg:py-20 lg:pr-14">
            <span style={rise(0)} className="hero-rise">
              <SiteLabel>{HOME.heroEyebrow}</SiteLabel>
            </span>

            <h1 className="mt-8 text-deodar">
              <span style={rise(1)} className="hero-rise t-display block font-normal">
                {HOME.heroLine1}
              </span>
              <span style={rise(2)} className="hero-rise t-hero block">
                {HOME.heroLine2}
              </span>
            </h1>

            <p style={rise(3)} className="hero-rise t-lead mt-8 max-w-md text-graphite/80">
              {HOME.heroSub}
            </p>

            <div style={rise(4)} className="hero-rise mt-10 flex flex-wrap gap-3">
              <a href={LINKS.interestForm} target="_blank" rel="noopener noreferrer" className="s-btn s-btn-primary">
                Register your interest
                <Arrow />
              </a>
              <Link href="/about" className="s-btn s-btn-outline">
                Learn about us
              </Link>
            </div>
          </div>

          <div className="relative min-h-[62svh] lg:min-h-0">
            {HOME.heroImage && (
              <div className="s-hero-photo absolute inset-0 overflow-hidden bg-deodar">
                <Image
                  src={HOME.heroImage}
                  alt="Himalayan foothills near Bharog Baneri"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  placeholder={placeholderFor(HOME.heroImage) ? "blur" : "empty"}
                  blurDataURL={placeholderFor(HOME.heroImage)?.blur}
                  className="object-cover object-[50%_40%]"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- MISSION */}
      <section className="s-section">
        <div className="s-container grid gap-12 lg:grid-cols-12 lg:gap-x-16">
          <div className="lg:col-span-5 lg:pt-2">
            <SectionHeading eyebrow="Why we exist" title={HOME.missionTitle} />
            <p className="t-lead mt-6 text-graphite/80">{HOME.missionBody}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/about" className="s-btn s-btn-dark">
                Our story
              </Link>
              <Link href="/projects" className="s-btn s-btn-outline">
                Explore projects
              </Link>
            </div>
          </div>
          <div className="lg:col-span-7">
            <Media
              src={HOME.missionImage}
              alt="Project RISHI members in the field"
              label="Mission / field photo"
              className="aspect-[4/3] w-full"
              rounded="rounded-[var(--r-media)]"
              sizes="(max-width: 1024px) 100vw, 58vw"
            />
          </div>
        </div>

        <dl className="s-container mt-[var(--space-block)] grid gap-x-8 gap-y-10 sm:grid-cols-3">
          {HOME.stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse border-t-[3px] border-saffron pt-6">
              <dt className="t-small mt-3 text-stone">{s.label}</dt>
              <dd className="t-display t-num text-deodar">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------------ PROJECTS */}
      <section className="s-section bg-mist">
        <div className="s-container">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <SectionHeading eyebrow="What we do" title="Four teams, One village" />
            </div>
            <p className="t-lead text-graphite/75 lg:col-span-5 lg:col-start-8">
              Our work in Bharog Baneri is carried out by four project teams, each
              tackling a different pillar of sustainable development.
            </p>
          </div>

          <div className="mt-[var(--space-block)] grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {PROJECTS.map((p) => (
              <article key={p.slug}>
                <Link href={`/projects/${p.slug}`} className="group block rounded-[var(--r-media)]">
                  <Media
                    src={p.image}
                    alt={p.name}
                    label={`${p.name} cover`}
                    className="aspect-[4/5] w-full"
                    rounded="rounded-[var(--r-media)]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <h3 className="t-h3 mt-5 flex items-center justify-between gap-3 text-deodar">
                    <span className="decoration-2 underline-offset-[0.2em] group-hover:underline">{p.name}</span>
                    <Arrow className="h-5 w-5 shrink-0 transition-transform duration-150 group-hover:translate-x-1" />
                  </h3>
                  <p className="t-small mt-2 line-clamp-3 text-stone">{p.intro}</p>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- METHODOLOGY */}
      {/* A real sequence, so it reads as one line: five stops, left to right
          (top to bottom on phones). */}
      <section className="s-dark s-section bg-deodar text-snow">
        <div className="s-container">
          <SectionHeading eyebrow="How we work" title={ABOUT.methodology.title} tone="dark" />
          <ol className="relative mt-[var(--space-block)] grid gap-9 before:absolute before:bottom-3 before:left-[0.6875rem] before:top-3 before:w-px before:bg-snow/25 sm:grid-cols-5 sm:gap-6 sm:before:bottom-auto sm:before:left-0 sm:before:right-0 sm:before:top-[0.6875rem] sm:before:h-px sm:before:w-auto">
            {ABOUT.methodology.steps.map((step, i) => (
              <li key={step} className="relative grid grid-cols-[1.375rem_1fr] gap-x-5 sm:block">
                <span className="relative z-10 mt-0.5 block h-[1.375rem] w-[1.375rem] rounded-full border-2 border-saffron bg-deodar sm:mt-0" aria-hidden />
                <div className="sm:mt-6">
                  <span className="t-label t-num block text-saffron">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="t-h3 mt-1.5 block">{step}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------------- GET INVOLVED */}
      <section className="s-section">
        <div className="s-container grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col items-start rounded-[var(--r-media)] bg-saffron p-[clamp(2rem,4vw,3.5rem)] text-deodar-deep">
            <h2 className="t-h2">Join us</h2>
            <p className="t-lead mb-10 mt-4 max-w-md">
              Applications are open now!
            </p>
            <Link href="/apply" className="s-btn s-btn-dark mt-auto">
              See recruitment dates
              <Arrow />
            </Link>
          </div>

          <div className="s-dark flex flex-col items-start rounded-[var(--r-media)] bg-deodar p-[clamp(2rem,4vw,3.5rem)] text-snow">
            <h2 className="t-h2">Become a donor</h2>
            <p className="t-lead mb-10 mt-4 max-w-md text-snow/90">
              We appreciate donations of all sizes — they keep us running and
              directly support our work in Bharog Baneri.
            </p>
            <a href={LINKS.donate} className="s-btn s-btn-primary mt-auto">
              Donate now
              <Arrow />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
