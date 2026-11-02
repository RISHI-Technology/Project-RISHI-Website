"use client";

import Link from "next/link";
import Image from "next/image";
import { placeholderFor } from "@/lib/imagePlaceholders";
import type { CSSProperties } from "react";
import Media from "@/components/Media";
import Reveal from "@/components/Reveal";
import Contours from "@/components/Contours";
import SectionHeading from "@/components/SectionHeading";
import { HOME, PROJECTS, ABOUT, LINKS } from "@/lib/content";

export default function Home() {
  // The site's one orchestrated moment: the hero lines rise in, ~1s in all.
  // Pure CSS (.hero-rise in globals.css), so it starts at first paint instead
  // of waiting for JavaScript, and reduced motion shows everything at once.
  const rise = (i: number) => ({ style: { "--i": i } as CSSProperties });

  return (
    <>
      {/* ---------------------------------------------------------------- HERO */}
      {/* The photo is the subject: shown sharp, darkened only where the words
          sit (bottom and left), with the type anchored bottom-left. */}
      <section className="relative flex min-h-[92vh] min-h-[92svh] flex-col overflow-hidden bg-pine-deep text-paper">
        {HOME.heroImage && (
          <Image
            src={HOME.heroImage}
            alt="Himalayan foothills near Bharog Baneri"
            fill
            priority
            sizes="100vw"
            placeholder={placeholderFor(HOME.heroImage) ? "blur" : "empty"}
            blurDataURL={placeholderFor(HOME.heroImage)?.blur}
            className="object-cover object-[50%_40%]"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(20_54_40/0.94)_0%,rgb(20_54_40/0.6)_34%,rgb(20_54_40/0.12)_68%,rgb(20_54_40/0.4)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(20_54_40/0.55)_0%,rgb(20_54_40/0)_62%)]" />
        <Contours className="absolute inset-x-0 bottom-0 h-1/2 w-full text-paper" opacity={0.06} />

        <div className="container-rishi relative z-10 mt-auto pb-8 pt-[calc(var(--header-h)+5rem)] [text-shadow:_0_1px_24px_rgba(12,22,16,0.35)] sm:pb-10">
          <h1 className="font-display font-semibold leading-[0.9]">
            <span style={rise(0).style} className="hero-rise block text-[3.25rem] sm:text-7xl lg:text-[5rem]">
              {HOME.heroLine1}
            </span>
            <span style={rise(1).style} className="hero-rise block text-[4.5rem] text-marigold sm:text-8xl lg:text-[6rem]">
              {HOME.heroLine2}
            </span>
          </h1>

          <p style={rise(2).style} className="hero-rise mt-6 max-w-xl text-lg text-paper/90 sm:text-xl">
            {HOME.heroSub}
          </p>

          <div style={rise(3).style} className="hero-rise mt-9 flex flex-wrap gap-3">
            <a href={LINKS.interestForm} target="_blank" rel="noopener noreferrer" className="btn-accent">
              Register your interest
            </a>
            <Link href="/about" className="btn border border-paper/40 text-paper hover:bg-paper hover:text-pine-deep">
              Learn about us
            </Link>
          </div>

          {/* Foot of the hero: the chapter line, and a quiet cue that the
              page continues. */}
          <div
            style={rise(4).style}
            className="hero-rise mt-16 flex items-center justify-between gap-6 border-t border-paper/20 pt-5 sm:mt-24"
          >
            <span className="inline-flex items-center gap-3 text-sm font-medium text-paper/80">
              <span className="h-px w-6 bg-marigold" />
              {HOME.heroEyebrow}
            </span>
            <div className="relative h-8 w-px overflow-hidden bg-paper/25" aria-hidden>
              <span className="absolute inset-x-0 top-0 h-3 bg-marigold" />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- MISSION */}
      <section className="container-rishi py-24 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <SectionHeading eyebrow="Why we exist" title={HOME.missionTitle} />
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink/75">
                {HOME.missionBody}
              </p>
            </Reveal>

            {/* The chapter at a glance, set as a ledger rather than a row of
                big-number boxes. */}
            <dl className="mt-10 max-w-[34rem] border-b border-pine/15">
              {HOME.stats.map((s, i) => (
                <Reveal key={s.label} delay={i * 0.1} className="flex items-baseline justify-between gap-6 border-t border-pine/15 py-4">
                  <dt className="text-[15px] text-ink/75">{s.label}</dt>
                  <dd className="font-display text-3xl font-semibold tabular-nums text-pine">
                    {s.value}
                  </dd>
                </Reveal>
              ))}
            </dl>

            <Reveal delay={0.1}>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/about" className="btn-primary">
                  Our story
                </Link>
                <Link href="/projects" className="btn-ghost">
                  Explore projects
                </Link>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.15} className="lg:col-span-6">
            <Media
              src={HOME.missionImage}
              alt="Project RISHI members in the field"
              label="Mission / field photo"
              className="aspect-[4/3] w-full lg:aspect-auto lg:h-full lg:min-h-[34rem]"
              rounded="rounded-2xl"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ PROJECTS */}
      <section className="relative overflow-hidden bg-pine-deep py-24 text-paper lg:py-32">
        <Contours className="absolute inset-x-0 top-0 h-80 w-full text-marigold" opacity={0.1} />
        <div className="container-rishi relative z-10">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <SectionHeading eyebrow="What we do" title="Four teams, One village" accent="pine" tone="dark" />
            </div>
            <Reveal delay={0.1} className="lg:col-span-5 lg:col-start-8">
              <p className="max-w-xl text-lg leading-relaxed text-paper/70">
                Our work in Bharog Baneri is carried out by four project teams, each
                tackling a different pillar of sustainable development.
              </p>
            </Reveal>
          </div>

          <div className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:mt-16">
            {PROJECTS.map((p, i) => (
              <Reveal as="article" key={p.slug} delay={i * 0.08}>
                <Link href={`/projects/${p.slug}`} className="group block rounded-2xl">
                  <Media
                    src={p.image}
                    alt={p.name}
                    label={`${p.name} cover`}
                    className="aspect-[3/2] w-full [&_img]:transition-transform [&_img]:duration-700 [&_img]:ease-out group-hover:[&_img]:scale-[1.03]"
                    rounded="rounded-2xl"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  <div className="mt-6 flex items-start justify-between gap-6">
                    <div>
                      <h3 className="font-display text-2xl font-semibold sm:text-[1.75rem]">{p.name}</h3>
                      <p className="mt-2 line-clamp-2 max-w-md text-[15px] leading-relaxed text-paper/65">
                        {p.intro}
                      </p>
                    </div>
                    <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-paper/25 text-paper transition-colors duration-200 group-hover:border-marigold group-hover:bg-marigold group-hover:text-pine-deep">
                      <svg className="h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- METHODOLOGY */}
      {/* The order is the point, so the steps sit on one ruled line, read left
          to right. */}
      <section className="container-rishi pb-16 pt-24 lg:pb-20 lg:pt-32">
        <SectionHeading eyebrow="How we work" title={ABOUT.methodology.title} />
        <ol className="mt-12 grid gap-x-6 sm:grid-cols-3 lg:mt-14 lg:grid-cols-5">
          {ABOUT.methodology.steps.map((step, i) => (
            <Reveal as="li" key={step} delay={i * 0.08} className="border-t border-pine/25 pb-6 pt-5">
              <span className="block text-sm font-semibold tabular-nums text-marigold-ink">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="mt-6 block font-display text-2xl font-semibold text-pine-deep">
                {step}
              </span>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ----------------------------------------------------------- GET INVOLVED */}
      <section className="container-rishi pb-24 lg:pb-32">
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="relative overflow-hidden rounded-2xl bg-pine p-10 text-paper sm:p-12">
            <Contours className="absolute inset-0 h-full w-full text-paper" opacity={0.12} />
            <div className="relative z-10 flex h-full flex-col items-start">
              <h3 className="font-display text-3xl font-semibold sm:text-4xl">Join us</h3>
              <p className="mb-8 mt-3 max-w-md text-lg text-paper/75">
                Applications are open now!
              </p>
              <Link href="/apply" className="btn-accent mt-auto">
                See recruitment dates
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="relative overflow-hidden rounded-2xl bg-marigold p-10 text-pine-deep sm:p-12">
            <div className="relative z-10 flex h-full flex-col items-start">
              <h3 className="font-display text-3xl font-semibold sm:text-4xl">Become a donor</h3>
              <p className="mb-8 mt-3 max-w-md text-lg text-pine-deep/90">
                We appreciate donations of all sizes — they keep us running and
                directly support our work in Bharog Baneri.
              </p>
              <a href={LINKS.donate} className="btn mt-auto bg-pine-deep text-paper hover:-translate-y-0.5">
                Donate now
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
