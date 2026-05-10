"use client"

import { useState } from "react"
import { Upload, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createRecommenderUploadUrl,
  finalizeRecommenderSubmission,
} from "@/lib/recommenders/actions"
import { cn } from "@/lib/utils"

const MAX_BYTES = 20 * 1024 * 1024
const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"]

/**
 * F-2: PDF upload form embedded in /r/[token] for the recommender.
 *
 * Same direct-to-storage pattern as the student-side uploader (signed
 * URL → PUT → register), but the auth scope is the token, not a
 * cookie session. Server actions verify the token on every call.
 */
export function RecommenderUploadForm({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState("")
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function pick(f: File | null) {
    setError(null)
    if (!f) return
    if (f.size > MAX_BYTES) {
      setError("Файл больше 20 МБ — пожалуйста, сожмите PDF")
      return
    }
    if (!ALLOWED_MIME.includes(f.type)) {
      setError("Поддерживаются PDF, PNG, JPEG, WEBP")
      return
    }
    setFile(f)
    if (!label) setLabel(f.name.replace(/\.[^.]+$/, ""))
  }

  async function submit() {
    if (!file) return
    setError(null)
    setPending(true)
    setProgress(0)
    try {
      const sig = await createRecommenderUploadUrl(token, file.name)
      if (!sig.ok) throw new Error(sig.error)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("PUT", sig.signedUrl)
        xhr.setRequestHeader("Content-Type", file.type)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload failed (${xhr.status})`))
        xhr.onerror = () => reject(new Error("сеть прервалась"))
        xhr.send(file)
      })

      const fin = await finalizeRecommenderSubmission({
        token,
        path: sig.path,
        size: file.size,
        mimeType: file.type,
        label: label.trim() || file.name,
      })
      if (!fin.ok) throw new Error(fin.error ?? "Не удалось зарегистрировать файл")

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки")
    } finally {
      setPending(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-3">
        <CheckCircle2 className="h-10 w-10 text-emerald-300 mx-auto" />
        <h2 className="font-display text-xl text-cream">Спасибо!</h2>
        <p className="font-serif text-sm text-cream-2">
          Файл успешно отправлен студенту. Эта ссылка теперь не действительна — её нельзя использовать
          повторно. Вы можете закрыть вкладку.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 sm:p-6 space-y-4">
      <div className="space-y-1.5">
        <Label className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">
          Файл рекомендации (PDF / PNG / JPG, до 20 МБ)
        </Label>
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          disabled={pending}
          className="block w-full text-sm font-serif text-cream-2 file:mr-3 file:rounded-md file:border-0 file:bg-card file:px-3 file:py-2 file:text-xs file:font-mono-label file:text-cream-2 hover:file:bg-card/70 cursor-pointer"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">
          Подпись (опц.)
        </Label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="LOR for MIT undergrad"
          disabled={pending}
        />
      </div>

      {pending && (
        <div className="space-y-1">
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="font-mono-label text-[10px] text-cream-3">Загрузка · {progress}%</p>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      <Button onClick={submit} disabled={!file || pending} className="w-full gap-2">
        {pending ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Отправляю...</>
        ) : (
          <><Upload className="h-4 w-4" /> Отправить рекомендацию</>
        )}
      </Button>

      <p className={cn("text-center font-mono-label text-[10px] text-cream-3")}>
        Файл будет доступен только этому студенту в его аккаунте Entrium.
      </p>
    </div>
  )
}
