"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import Media from "@/components/Media";
import SectionHeading from "@/components/SectionHeading";
import { Chevron } from "@/components/site/Icons";
import { placeholderFor } from "@/lib/imagePlaceholders";
import { HOME, PROJECTS, ABOUT, LINKS } from "@/lib/content";

/**
 * The foothills photograph as the hero's background, edge to edge.
 *
 * Same motion principle as the site's ScrollWindow: driven by native scroll
 * (no scroll-jacking, so it follows if you stop or reverse), smoothed by a
 * critically damped spring, and only `transform` animates. As the hero
 * scrolls away the photo drifts down and in slightly, so the hills recede
 * behind the page. Reduced motion: a still photo.
 */
function HeroBackdrop({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 260, damping: 40, mass: 0.6 });
  // Pinned rather than removed under reduced motion, so no stale transform lingers.
  const y = useTransform(smooth, [0, 1], reduce ? ["0%", "0%"] : ["0%", "12%"]);
  const scale = useTransform(smooth, [0, 1], reduce ? [1, 1] : [1, 1.06]);
  const ph = placeholderFor(src);

  return (
    <div ref={ref} className="absolute inset-0 -z-10 overflow-hidden bg-night">
      <motion.div style={{ y, scale }} className="absolute inset-0 will-change-transform">
        <Image
          src={src}
          alt={alt}
          fill
          priority
          sizes="100vw"
          placeholder={ph ? "blur" : "empty"}
          blurDataURL={ph?.blur}
          className="scale-110 object-cover object-[50%_60%] blur-[3px]"
        />
      </motion.div>
      {/* The photo is softened (3px blur, scaled so the blurred edges stay
          off-screen) and washed in pine top to bottom, deepest at the foot,
          so it reads as a backdrop rather than a full-strength picture. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(var(--a-night)/0.3)_0%,rgb(var(--a-night)/0.35)_50%,rgb(var(--a-night)/0.75)_100%)]" />
    </div>
  );
}

export default function Home() {
  // The page's one orchestrated moment: the headline rises in on load
  // (.hero-rise, globals.css — CSS, so it starts at first paint; reduced motion
  // shows it at once) over the Himalayas, which drift back as you scroll.
  const rise = (i: number) => ({ "--i": i }) as CSSProperties;

  return (
    <div className="site">
      {/* ---------------------------------------------------------------- HERO */}
      <section className="a-on-dark relative isolate flex min-h-[92svh] flex-col justify-center overflow-hidden">
        {HOME.heroImage && <HeroBackdrop src={HOME.heroImage} alt="Himalayan foothills near Bharog Baneri" />}
        <div className="a-wrap pb-[clamp(3rem,6vw,5rem)] pt-[calc(var(--header-h)+clamp(3rem,6vw,5rem))] text-center">
          <p style={rise(0)} className="hero-rise a-eyebrow text-marigold-soft">{HOME.heroEyebrow}</p>
          <h1 className="a-hero mt-3 text-white">
            {/* Stacked at every size: "Project" above "RISHI". */}
            <span style={rise(1)} className="hero-rise block">{HOME.heroLine1}</span>{" "}
            <span style={rise(2)} className="hero-rise block text-marigold">{HOME.heroLine2}</span>
          </h1>
          <p style={rise(3)} className="hero-rise a-lead mx-auto mt-5 max-w-2xl text-white/90">
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
      </section>

      {/* ------------------------------------------------------------- MISSION */}
      <section className="py-[var(--a-section)]">
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
      {/* All four teams at once — one row on wide screens, two by two on
          phones — so none sits off-screen behind a sideways scroll. */}
      <section className="a-on-dark a-band-dark py-[var(--a-section)]">
        <div className="a-wrap a-reveal">
          <SectionHeading eyebrow="What we do" title="Four teams, One village" tone="dark" />
          <p className="a-lead mt-5 max-w-2xl text-white/70">
            Our work in Bharog Baneri is carried out by four project teams, each
            tackling a different pillar of sustainable development.
          </p>

          <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {PROJECTS.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/projects/${p.slug}`}
                  className="a-press group relative block overflow-hidden rounded-[var(--a-r-md)] bg-night-2 sm:rounded-[var(--a-r-lg)]"
                >
                  <Media
                    src={p.image}
                    alt={p.name}
                    label={`${p.name} cover`}
                    className="aspect-[3/4] w-full [&_img]:transition-transform [&_img]:duration-700 [&_img]:ease-out group-hover:[&_img]:scale-[1.04]"
                    rounded="rounded-none"
                    sizes="(max-width: 1024px) 50vw, 18rem"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(var(--a-night)/0.92)_0%,rgb(var(--a-night)/0.55)_38%,rgb(var(--a-night)/0)_62%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                    <h3 className="a-title3 flex items-end justify-between gap-3 text-white max-sm:text-[1.0625rem]">
                      {p.name}
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 transition-colors duration-150 group-hover:bg-marigold group-hover:text-label max-sm:hidden">
                        <Chevron className="h-4 w-4" />
                      </span>
                    </h3>
                    <p className="a-callout mt-2 line-clamp-2 text-white/75 max-sm:hidden">{p.intro}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------- METHODOLOGY */}
      {/* A real sequence: five stops on one line. As the row scrolls into
          view the line fills and each number lights up in turn (.a-steps,
          site.css). */}
      <section className="py-[var(--a-section)]">
        <div className="a-wrap">
          <div className="a-reveal text-center">
            <SectionHeading eyebrow="How we work" title={ABOUT.methodology.title} align="center" />
          </div>
          <div className="a-steps relative mt-14">
            <div className="absolute left-[calc(1.375rem-1.5px)] top-0 h-full w-[3px] rounded-full bg-label/15 sm:left-0 sm:top-[calc(1.375rem-1.5px)] sm:h-[3px] sm:w-full" aria-hidden>
              <div className="a-progress-fill h-full w-full rounded-full bg-marigold" />
            </div>
            <ol className="relative grid gap-8 sm:grid-cols-5 sm:gap-4">
              {ABOUT.methodology.steps.map((step, i) => (
                <li key={step} className="flex items-center gap-5 sm:flex-col sm:items-start sm:gap-5">
                  <span className="a-step-dot a-num grid h-11 w-11 shrink-0 place-items-center rounded-full bg-marigold text-[0.9375rem] font-semibold text-label ring-[6px] ring-canvas">
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
