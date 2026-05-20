"use client"

import { GraduationCap } from "lucide-react"

/**
 * Real alumni — names + university + country + ranking tier. Shown as a
 * seamless horizontal marquee. The list is rendered twice in a row so when
 * the first copy scrolls off the left, the second copy is already filling
 * the right, creating an unbroken loop.
 *
 * If you add/remove people here, the CSS animation distance stays correct
 * automatically because each `.alumni-track` half is 100% wide and the
 * keyframe shifts by exactly -50%.
 */

const ALUMNI = [
  { name: "Заргинор Умаров",        uni: "LSE",              country: "UK",     rank: "TOP 50" },
  { name: "Мухаммадсултон Султанов", uni: "Sapienza",         country: "Italy",  rank: "TOP 100" },
  { name: "Mukhammadamin Kozimov",  uni: "NYU",              country: "USA",    rank: "TOP 50" },
  { name: "Ali Avazkhonov",         uni: "Sapienza",         country: "Italy",  rank: "TOP 100" },
  { name: "Giyosiy Bilol",          uni: "Tor Vergata",      country: "Italy",  rank: "TOP 300" },
  { name: "Ismailov Jakhongir",     uni: "Purdue",           country: "USA",    rank: "TOP 100" },
  { name: "Ashurov Sardor",         uni: "Purdue",           country: "USA",    rank: "TOP 100" },
  { name: "Umid Karimov",           uni: "UCW",              country: "Canada", rank: "TOP 50 MBA" },
  { name: "Vokhidov Gulomjon",      uni: "USA University",   country: "USA",    rank: "TOP 500" },
  { name: "Nilufar",                uni: "Messina",          country: "Italy",  rank: "TOP 1000" },
] as const

export function AlumniRail() {
  return (
    <div className="relative overflow-hidden py-6">
      {/* Soft fade-out on both edges so names don't get clipped abruptly */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none"
      />

      <div className="alumni-marquee flex w-max">
        <ul className="alumni-track flex shrink-0 gap-10">
          {ALUMNI.map((a, i) => (
            <AlumniItem key={`a-${i}`} {...a} />
          ))}
        </ul>
        <ul className="alumni-track flex shrink-0 gap-10" aria-hidden>
          {ALUMNI.map((a, i) => (
            <AlumniItem key={`b-${i}`} {...a} />
          ))}
        </ul>
      </div>
    </div>
  )
}

function AlumniItem({
  name,
  uni,
  country,
  rank,
}: {
  name: string
  uni: string
  country: string
  rank: string
}) {
  return (
    <li className="flex items-center gap-3 shrink-0">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--brand-red-soft)] shrink-0">
        <GraduationCap className="h-4 w-4 text-[var(--brand-red)]" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display font-extrabold text-base tracking-tight whitespace-nowrap">
          {name}
        </span>
        <span className="font-mono-label text-foreground/65 whitespace-nowrap">
          <span className="text-[var(--brand-red)]">→</span> {uni} · {country} · {rank}
        </span>
      </span>
    </li>
  )
}
