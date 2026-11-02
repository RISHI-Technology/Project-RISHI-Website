"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import Media from "@/components/Media";
import SectionHeading from "@/components/SectionHeading";
import ScrollWindow from "@/components/site/ScrollWindow";
import Gallery from "@/components/site/Gallery";
import { Chevron } from "@/components/site/Icons";
import { HOME, PROJECTS, ABOUT, LINKS } from "@/lib/content";

export default function Home() {
  // The page's one orchestrated moment: the headline rises in on load
  // (.hero-rise, globals.css — CSS, so it starts at first paint; reduced motion
  // shows it at once), then the Himalayas window opens as you scroll.
  const rise = (i: number) => ({ "--i": i }) as CSSProperties;

  return (
    <div className="site">
      {/* ---------------------------------------------------------------- HERO */}
      <section className="a-glow pb-[var(--a-section)] pt-[calc(var(--header-h)+clamp(3.5rem,8vw,6.5rem))]">
        <div className="a-wrap text-center">
          <p style={rise(0)} className="hero-rise a-eyebrow">{HOME.heroEyebrow}</p>
          <h1 className="a-hero mt-3">
            <span style={rise(1)} className="hero-rise inline-block">{HOME.heroLine1}</span>{" "}
            <span style={rise(2)} className="hero-rise inline-block text-pine">{HOME.heroLine2}</span>
          </h1>
          <p style={rise(3)} className="hero-rise a-lead mx-auto mt-5 max-w-2xl text-label-2">
            {HOME.heroSub}
          </p>
          <div style={rise(4)} className="hero-rise mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <a href={LINKS.interestForm} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-primary">
              Register your interest
            </a>
            <Link href="/about" className="a-more">
              <span>Learn about us</span>
              <Chevron />
            </Link>
          </div>
        </div>

        <div style={rise(5)} className="hero-rise mt-[clamp(3rem,6vw,5rem)]">
          <ScrollWindow
            src={HOME.heroImage}
            alt="Himalayan foothills near Bharog Baneri"
            priority
            className="aspect-[4/5] sm:aspect-[16/10] lg:aspect-[2.1/1]"
          />
        </div>
      </section>

      {/* ------------------------------------------------------------- MISSION */}
      <section className="pb-[var(--a-section)]">
        <div className="a-wrap">
          <div className="a-reveal mx-auto max-w-3xl text-center">
            <SectionHeading eyebrow="Why we exist" title={HOME.missionTitle} align="center" />
            <p className="a-lead mt-6 text-label-2">{HOME.missionBody}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              <Link href="/about" className="a-btn a-btn-pine">
                Our story
              </Link>
              <Link href="/projects" className="a-more">
                <span>Explore projects</span>
                <Chevron />
              </Link>
            </div>
          </div>

          {/* Photo + the chapter at a glance, as one bento */}
          <div className="mt-[clamp(3rem,6vw,5rem)] grid gap-5 lg:grid-cols-3">
            <div className="a-reveal lg:col-span-2 lg:row-span-3">
              <Media
                src={HOME.missionImage}
                alt="Project RISHI members in the field"
                label="Mission / field photo"
                className="aspect-[4/3] h-full w-full lg:aspect-auto"
                rounded="rounded-[var(--a-r-lg)]"
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            </div>
            <dl className="contents">
              {HOME.stats.map((s) => (
                <div key={s.label} className="a-reveal a-tile flex flex-col-reverse justify-center p-8">
                  <dt className="a-callout mt-1 text-label-2">{s.label}</dt>
                  <dd className="a-num font-display text-[clamp(2.75rem,4.5vw,3.75rem)] font-semibold leading-none tracking-[-0.03em] text-pine">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ PROJECTS */}
      <section className="a-on-dark a-band-dark py-[var(--a-section)]">
        <div className="a-wrap a-reveal">
          <SectionHeading eyebrow="What we do" title="Four teams, One village" tone="dark" />
          <p className="a-lead mt-5 max-w-2xl text-white/70">
            Our work in Bharog Baneri is carried out by four project teams, each
            tackling a different pillar of sustainable development.
          </p>
        </div>

        <div className="mt-12">
          <Gallery tone="dark">
            {PROJECTS.map((p) => (
              <Link
                key={p.slug}
                href={`/projects/${p.slug}`}
                className="a-press group relative block w-[min(78vw,22rem)] overflow-hidden rounded-[var(--a-r-lg)] bg-night-2 sm:w-[24rem]"
              >
                <Media
                  src={p.image}
                  alt={p.name}
                  label={`${p.name} cover`}
                  className="aspect-[3/4] w-full [&_img]:transition-transform [&_img]:duration-700 [&_img]:ease-out group-hover:[&_img]:scale-[1.04]"
                  rounded="rounded-none"
                  sizes="(max-width: 640px) 78vw, 24rem"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(var(--a-night)/0.92)_0%,rgb(var(--a-night)/0.55)_38%,rgb(var(--a-night)/0)_62%)]" />
                <div className="absolute inset-x-0 bottom-0 p-7">
                  <h3 className="a-title2 flex items-center justify-between gap-3 text-white">
                    {p.name}
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 transition-colors duration-150 group-hover:bg-marigold group-hover:text-label">
                      <Chevron className="h-4 w-4" />
                    </span>
                  </h3>
                  <p className="a-callout mt-2 line-clamp-2 text-white/75">{p.intro}</p>
                </div>
              </Link>
            ))}
          </Gallery>
        </div>
      </section>

      {/* --------------------------------------------------------- METHODOLOGY */}
      {/* A real sequence: five stops on one line, the line filling in as the
          section scrolls into view. */}
      <section className="py-[var(--a-section)]">
        <div className="a-wrap">
          <div className="a-reveal text-center">
            <SectionHeading eyebrow="How we work" title={ABOUT.methodology.title} align="center" />
          </div>
          <div className="relative mt-14">
            <div className="absolute left-[1.375rem] top-0 h-full w-[2px] rounded-full bg-label/10 sm:left-0 sm:top-[1.375rem] sm:h-[2px] sm:w-full" aria-hidden>
              <div className="a-progress-fill h-full w-full rounded-full bg-marigold" />
            </div>
            <ol className="relative grid gap-8 sm:grid-cols-5 sm:gap-4">
              {ABOUT.methodology.steps.map((step, i) => (
                <li key={step} className="flex items-center gap-5 sm:flex-col sm:items-start sm:gap-5">
                  <span className="a-num grid h-11 w-11 shrink-0 place-items-center rounded-full bg-marigold text-[0.9375rem] font-semibold text-label ring-[6px] ring-canvas">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="a-title2">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- GET INVOLVED */}
      <section className="py-[var(--a-section)]">
        <div className="a-wrap grid gap-5 lg:grid-cols-2">
          <div className="a-reveal flex min-h-[22rem] flex-col items-start rounded-[var(--a-r-lg)] bg-marigold p-[clamp(2rem,4vw,3.5rem)] text-label">
            <h2 className="a-display">Join us</h2>
            <p className="a-lead mb-10 mt-3 max-w-md">Applications are open now!</p>
            <Link href="/apply" className="a-btn a-btn-pine mt-auto">
              See recruitment dates
            </Link>
          </div>

          <div className="a-reveal a-on-dark flex min-h-[22rem] flex-col items-start rounded-[var(--a-r-lg)] bg-pine p-[clamp(2rem,4vw,3.5rem)]">
            <h2 className="a-display">Become a donor</h2>
            <p className="a-lead mb-10 mt-3 max-w-md text-white/80">
              We appreciate donations of all sizes — they keep us running and
              directly support our work in Bharog Baneri.
            </p>
            <a href={LINKS.donate} className="a-btn a-btn-primary mt-auto">
              Donate now
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
