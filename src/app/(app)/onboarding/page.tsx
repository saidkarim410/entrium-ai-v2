import { redirect } from "next/navigation"
import { getApplicantProfile, getOnboardingInitial } from "@/lib/applicant/actions"
import { attributeReferralIfPending } from "@/lib/referrals/actions"
import { OnboardingWizard } from "./onboarding-wizard"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  // First-time entry into the app — attribute referral if cookie was set on signup
  await attributeReferralIfPending().catch(() => null)

  // Bail straight to dashboard if onboarding was already completed
  const existing = await getApplicantProfile()
  if (existing._completed) redirect("/dashboard")

  const { profile, autofilled, source } = await getOnboardingInitial()
  return <OnboardingWizard initial={profile} autofilled={autofilled} source={source} />
}
