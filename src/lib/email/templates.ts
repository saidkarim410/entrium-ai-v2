import type { Locale } from "@/lib/i18n/dict"

/**
 * Plain-html email templates. Inline styles so they survive every client.
 * No external CSS, no JS — works in Gmail, Outlook, Apple Mail, mobile.
 */

const COLORS = {
  bg: "#0F0E0C",
  surface: "#1A1813",
  border: "#2A271F",
  cream: "#F5EFDC",
  cream2: "#D8CFB8",
  cream3: "#9D9483",
  gold: "#D9B074",
}

type DigestApp = {
  university: string
  status: string
  daysOut: number | null
  deadline: string | null
}

export type WeeklyDigestData = {
  firstName: string
  appsCount: number
  upcomingApps: DigestApp[]   // ≤5 nearest deadlines
  unreadNotifs: number
  weekRunCount: number        // tool runs this past week
  topRecommendation: { title: string; href: string; reason: string }
  unsubscribeUrl: string
  siteUrl: string
}

export function weeklyDigestSubject(data: WeeklyDigestData, lang: Locale = "ru"): string {
  if (lang === "en") {
    if (data.upcomingApps[0]?.daysOut !== undefined && data.upcomingApps[0]!.daysOut! <= 7) {
      return `🔥 ${data.upcomingApps[0]!.university} due in ${data.upcomingApps[0]!.daysOut} days`
    }
    return `Entrium · weekly digest · ${data.appsCount} apps`
  }
  if (lang === "uz") {
    if (data.upcomingApps[0]?.daysOut !== undefined && data.upcomingApps[0]!.daysOut! <= 7) {
      return `🔥 ${data.upcomingApps[0]!.university} · ${data.upcomingApps[0]!.daysOut} kun qoldi`
    }
    return `Entrium · haftalik xulosalar · ${data.appsCount} ariza`
  }
  if (data.upcomingApps[0]?.daysOut !== undefined && data.upcomingApps[0]!.daysOut! <= 7) {
    return `🔥 ${data.upcomingApps[0]!.university} — дедлайн через ${data.upcomingApps[0]!.daysOut} дн.`
  }
  return `Entrium · еженедельный дайджест · ${data.appsCount} заявок`
}

export function weeklyDigestHtml(data: WeeklyDigestData, lang: Locale = "ru"): string {
  const t = i18n[lang] ?? i18n.ru
  const upcomingRows = data.upcomingApps
    .map((a) => {
      const urgent = a.daysOut !== null && a.daysOut <= 7 && a.daysOut >= 0
      const daysLabel =
        a.daysOut === null
          ? "—"
          : a.daysOut < 0
            ? t.past
            : a.daysOut === 0
              ? t.today
              : `${a.daysOut} ${t.daysShort}`
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border}">
            <p style="margin:0;font-family:Georgia,serif;font-size:15px;color:${COLORS.cream}">${escape(a.university)}</p>
            <p style="margin:2px 0 0;font-family:monospace;font-size:11px;color:${COLORS.cream3}">${escape(a.status)}${a.deadline ? ` · ${escape(a.deadline)}` : ""}</p>
          </td>
          <td align="right" valign="top" style="padding:10px 0;border-bottom:1px solid ${COLORS.border}">
            <span style="font-family:monospace;font-size:12px;color:${urgent ? "#fca5a5" : COLORS.cream2}">${escape(daysLabel)}</span>
          </td>
        </tr>`
    })
    .join("")

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Entrium · ${t.subject}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};color:${COLORS.cream};font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <!-- Brand -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr>
        <td style="font-family:Georgia,serif;font-size:18px;font-weight:600;color:${COLORS.cream}">
          Entrium AI
        </td>
        <td align="right" style="font-family:monospace;font-size:11px;color:${COLORS.cream3};text-transform:uppercase;letter-spacing:1px">
          ${t.weeklyTag}
        </td>
      </tr>
    </table>

    <!-- Greeting -->
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:400;color:${COLORS.cream};line-height:1.3">
      ${t.greeting(data.firstName)}
    </h1>
    <p style="margin:0 0 24px;font-family:Georgia,serif;font-size:15px;color:${COLORS.cream2};line-height:1.6">
      ${t.intro(data.appsCount, data.weekRunCount)}
    </p>

    ${
      data.upcomingApps.length
        ? `
    <!-- Upcoming -->
    <div style="background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="margin:0 0 12px;font-family:monospace;font-size:11px;color:${COLORS.gold};text-transform:uppercase;letter-spacing:1px">
        ${t.deadlinesTitle}
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${upcomingRows}
      </table>
    </div>`
        : ""
    }

    <!-- CTA -->
    <div style="background:${COLORS.surface};border:1px solid ${COLORS.gold}40;border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="margin:0 0 6px;font-family:monospace;font-size:11px;color:${COLORS.gold};text-transform:uppercase;letter-spacing:1px">
        ${t.recoTag}
      </p>
      <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:17px;color:${COLORS.cream}">
        ${escape(data.topRecommendation.title)}
      </p>
      <p style="margin:0 0 14px;font-family:Georgia,serif;font-size:14px;color:${COLORS.cream2};line-height:1.6">
        ${escape(data.topRecommendation.reason)}
      </p>
      <a href="${escape(data.topRecommendation.href)}" style="display:inline-block;background:${COLORS.gold};color:${COLORS.bg};text-decoration:none;padding:10px 18px;border-radius:8px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:600">
        ${t.openButton} →
      </a>
    </div>

    ${
      data.unreadNotifs > 0
        ? `
    <p style="margin:0 0 24px;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.cream2}">
      ${t.unread(data.unreadNotifs)} <a href="${data.siteUrl}/dashboard" style="color:${COLORS.gold};text-decoration:none">${t.openDashboard}</a>
    </p>`
        : ""
    }

    <!-- Footer -->
    <hr style="border:none;border-top:1px solid ${COLORS.border};margin:32px 0 16px" />
    <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${COLORS.cream3};line-height:1.6">
      ${t.footerText}
      <br />
      <a href="${escape(data.unsubscribeUrl)}" style="color:${COLORS.cream3};text-decoration:underline">${t.unsubscribe}</a>
      &nbsp;·&nbsp;
      <a href="${escape(data.siteUrl)}/settings" style="color:${COLORS.cream3};text-decoration:underline">${t.settings}</a>
    </p>
  </div>
</body>
</html>`
}

const i18n: Record<Locale, {
  subject: string
  weeklyTag: string
  greeting: (name: string) => string
  intro: (apps: number, runs: number) => string
  deadlinesTitle: string
  recoTag: string
  openButton: string
  unread: (n: number) => string
  openDashboard: string
  footerText: string
  unsubscribe: string
  settings: string
  daysShort: string
  today: string
  past: string
}> = {
  ru: {
    subject: "Еженедельный дайджест",
    weeklyTag: "Еженедельно",
    greeting: (name) => `Привет, ${name}`,
    intro: (apps, runs) =>
      `На этой неделе у тебя ${apps} ${plur(apps, "заявка", "заявки", "заявок")} в работе. AI запускался ${runs} раз. Вот что важно.`,
    deadlinesTitle: "Ближайшие дедлайны",
    recoTag: "Рекомендую сделать",
    openButton: "Открыть",
    unread: (n) => `📬 У тебя ${n} ${plur(n, "новое уведомление", "новых уведомления", "новых уведомлений")}`,
    openDashboard: "→ открыть",
    footerText: "Этот дайджест приходит раз в неделю. Можно отключить в любое время.",
    unsubscribe: "Отписаться",
    settings: "Настройки",
    daysShort: "дн.",
    today: "сегодня",
    past: "прошло",
  },
  en: {
    subject: "Weekly digest",
    weeklyTag: "Weekly",
    greeting: (name) => `Hi, ${name}`,
    intro: (apps, runs) =>
      `You have ${apps} active application${apps === 1 ? "" : "s"} this week. AI ran ${runs} times. Here's what matters.`,
    deadlinesTitle: "Upcoming deadlines",
    recoTag: "Suggested action",
    openButton: "Open",
    unread: (n) => `📬 ${n} new notification${n === 1 ? "" : "s"}`,
    openDashboard: "→ open",
    footerText: "This digest is sent weekly. Unsubscribe anytime.",
    unsubscribe: "Unsubscribe",
    settings: "Settings",
    daysShort: "days",
    today: "today",
    past: "past",
  },
  uz: {
    subject: "Haftalik xulosalar",
    weeklyTag: "Haftalik",
    greeting: (name) => `Salom, ${name}`,
    intro: (apps, runs) =>
      `Bu hafta sizda ${apps} ta faol ariza bor. AI ${runs} marta ishladi. Mana eng muhimi.`,
    deadlinesTitle: "Yaqin muddatlar",
    recoTag: "Tavsiya etilgan harakat",
    openButton: "Ochish",
    unread: (n) => `📬 ${n} ta yangi xabar`,
    openDashboard: "→ ochish",
    footerText: "Haftalik xulosalar yuboriladi. Istalgan vaqtda bekor qilishingiz mumkin.",
    unsubscribe: "Obunani bekor qilish",
    settings: "Sozlamalar",
    daysShort: "kun",
    today: "bugun",
    past: "o'tgan",
  },
}

function plur(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
