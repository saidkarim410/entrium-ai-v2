import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const VALID_TOOLS = new Set([
  "profile", "analyzer", "tracker", "university",
  "scholarship", "essay", "humanizer", "interview",
  "recommendation", "cv", "cost",
])

export async function proxy(request: NextRequest) {
  // 404 for unknown /tools/<slug> paths — runs before auth redirect.
  const toolMatch = request.nextUrl.pathname.match(/^\/tools\/([^/]+)\/?$/)
  if (toolMatch && !VALID_TOOLS.has(toolMatch[1])) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
