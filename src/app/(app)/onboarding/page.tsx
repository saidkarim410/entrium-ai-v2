import { redirect } from "next/navigation"
import { getApplicantProfile } from "@/lib/applicant/actions"
import { attributeReferralIfPending } from "@/lib/referrals/actions"
import { OnboardingWizard } from "./onboarding-wizard"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  // First-time entry into the app — attribute referral if cookie was set on signup
  await attributeReferralIfPending().catch(() => null)

  const profile = await getApplicantProfile()
  // If user already completed onboarding, send them to dashboard
  if (profile._completed) redirect("/dashboard")
  return <OnboardingWizard initial={profile} />
}
