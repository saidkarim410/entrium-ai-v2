import Link from "next/link"
import { getCurrentProfile } from "@/lib/supabase/server"
import { checkUsage } from "@/lib/rate-limit"
import { getT } from "@/lib/i18n/server"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Sparkles, Map, FileText, Wand2, MessageSquare, Award, GraduationCap, Mail, FileUser } from "lucide-react"

const ICONS = {
  profile: Brain,
  analyzer: Sparkles,
  tracker: Map,
  university: GraduationCap,
  scholarship: Award,
  essay: FileText,
  humanizer: Wand2,
  interview: MessageSquare,
  recommendation: Mail,
  cv: FileUser,
} as const

export default async function DashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const t = await getT()
  const usage = await checkUsage(profile.id)

  const tools = (Object.keys(ICONS) as (keyof typeof ICONS)[]).map((k) => ({
    slug: k,
    name: t.tools[k].title,
    desc: t.tools[k].desc,
    Icon: ICONS[k],
  }))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container max-w-5xl mx-auto px-6 py-8 lg:py-12">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t.dashboard.hello}, {profile.full_name?.split(" ")[0] ?? "👋"}
          </h1>
          <p className="mt-2 text-muted-foreground">{t.dashboard.sub}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>{t.dashboard.plan}</CardDescription>
              <CardTitle className="text-2xl">{profile.tier === "pro" ? "Pro" : "Free"}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>{t.dashboard.remaining}</CardDescription>
              <CardTitle className="text-2xl">
                {usage.tier === "pro" ? "∞" : `${usage.remaining} ${t.dashboard.remaining_left}`}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>{t.dashboard.bonus}</CardDescription>
              <CardTitle className="text-2xl">{profile.bonus_credits ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight mb-4">{t.dashboard.tools_h2}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map(({ slug, name, desc, Icon }) => (
              <Link key={slug} href={`/tools/${slug}`}>
                <Card className="group h-full transition-all hover:border-foreground/20 hover:shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent transition-transform group-hover:scale-110">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <CardTitle className="mt-4 text-base">{name}</CardTitle>
                    <CardDescription className="leading-relaxed">{desc}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
