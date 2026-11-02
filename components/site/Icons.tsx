/** Small line icons for the public site — one stroke weight, sized in em so
 *  they track the text they sit beside. */
type P = { className?: string };

export const Chevron = ({ className = "h-[0.8em] w-[0.8em]" }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const ArrowUpRight = ({ className = "h-[0.85em] w-[0.85em]" }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);
