export type NotificationType = "deadline" | "tip" | "system" | "agent_done" | "referral"

export type Notification = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export const TYPE_LABEL: Record<NotificationType, string> = {
  deadline: "Дедлайн",
  tip: "Совет",
  system: "Система",
  agent_done: "Agent",
  referral: "Реферал",
}
