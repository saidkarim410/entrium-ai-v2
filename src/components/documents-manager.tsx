"use client"

import { useState, useTransition, useEffect } from "react"
import { toast } from "sonner"
import { Upload, FileText, Image as ImageIcon, Trash2, Download, Loader2, FilePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"
import {
  createUploadUrl,
  registerDocument,
  deleteDocument,
  getDownloadUrl,
  listDocuments,
} from "@/lib/documents/actions"
import { KIND_LABELS, type DocumentKind, type DocumentRow } from "@/lib/documents/types"
import { undoToast } from "@/components/undo-toast"
import { cn } from "@/lib/utils"

/**
 * Documents manager (F-1 from TZ_FULLSTACK.md).
 *
 * Direct-to-storage upload: server creates a signed URL, browser PUTs
 * the file there, then we register a row in entrium.documents. This
 * bypasses the Next.js 2MB server-action body limit and keeps egress
 * off our compute.
 */
export function DocumentsManager({ initial }: { initial: DocumentRow[] }) {
  const [docs, setDocs] = useState<DocumentRow[]>(initial)
  const [, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Refresh on focus — student may have uploaded from another tab
  useEffect(() => {
    function refresh() {
      listDocuments().then((rows) => setDocs(rows)).catch(() => null)
    }
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [])

  async function handleFile(file: File, kind: DocumentKind, label: string) {
    setUploading(true)
    setProgress(0)
    try {
      const sig = await createUploadUrl({
        filename: file.name,
        kind,
        size: file.size,
        mimeType: file.type,
      })
      if (!sig.ok) {
        toast.error(sig.error)
        return
      }

      // Direct PUT to Supabase Storage. We use XHR (not fetch) so we
      // can hook progress events for a real upload bar — fetch's
      // ReadableStream upload progress isn't supported in all browsers.
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("PUT", sig.signedUrl)
        xhr.setRequestHeader("Content-Type", file.type)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload status ${xhr.status}`)))
        xhr.onerror = () => reject(new Error("upload network error"))
        xhr.send(file)
      })

      const reg = await registerDocument({
        path: sig.path,
        kind,
        label,
        size: file.size,
        mimeType: file.type,
      })
      if (!reg.ok) {
        toast.error(reg.error ?? "Не удалось зарегистрировать файл")
        return
      }

      // Optimistic local insert; server-side row already exists
      const localRow: DocumentRow = {
        id: reg.id ?? crypto.randomUUID(),
        user_id: "", // not used in UI
        storage_path: sig.path,
        kind,
        label: label || null,
        size_bytes: file.size,
        mime_type: file.type,
        recommender_invite_id: null,
        created_at: new Date().toISOString(),
      }
      setDocs((cur) => [localRow, ...cur])
      toast.success("Файл загружен")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка загрузки")
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  function clickDelete(d: DocumentRow) {
    const prev = docs
    setDocs((cur) => cur.filter((x) => x.id !== d.id))
    undoToast({
      message: `Удалён: ${d.label ?? d.storage_path.split("/").pop()}`,
      onUndo: () => setDocs(prev),
      onConfirm: async () => {
        const res = await deleteDocument(d.id)
        if (!res.ok) {
          setDocs(prev)
          throw new Error(res.error ?? "Не удалось")
        }
      },
    })
  }

  function clickDownload(d: DocumentRow) {
    startTransition(async () => {
      const res = await getDownloadUrl(d.id)
      if (!res.ok) {
        toast.error(res.error ?? "Не удалось получить ссылку")
        return
      }
      window.open(res.url, "_blank", "noopener")
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 sm:p-6 accent-strip space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono-label text-cream-3">Документы</p>
          <p className="font-serif text-xs text-cream-3 mt-0.5">
            PDF / JPG / PNG · до 20 МБ · приватные ссылки
          </p>
        </div>
        <UploadDialog onUpload={handleFile} pending={uploading} progress={progress} />
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon={FilePlus}
          title="Нет загруженных документов"
          description="Загрузи транскрипт, сертификаты и другие сканы — они подтянутся в твой профиль и в анализ AI."
          variant="bare"
        />
      ) : (
        <ol className="space-y-2">
          {docs.map((d) => {
            const Icon = (d.mime_type ?? "").startsWith("image/") ? ImageIcon : FileText
            const sizeKb = d.size_bytes ? Math.round(d.size_bytes / 1024) : 0
            const sizeLabel = sizeKb < 1024 ? `${sizeKb} КБ` : `${(sizeKb / 1024).toFixed(1)} МБ`
            return (
              <li key={d.id}>
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card/30 p-3">
                  <div className="grid place-items-center h-9 w-9 rounded-md bg-card/60 shrink-0">
                    <Icon className="h-4 w-4 text-cream-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm truncate">
                      {d.label ?? d.storage_path.split("/").pop()}
                    </p>
                    <p className="font-mono-label text-[10px] text-cream-3">
                      {KIND_LABELS[d.kind as DocumentKind] ?? d.kind} · {sizeLabel}
                      {d.recommender_invite_id && " · от рекомендателя"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => clickDownload(d)}
                    aria-label={`Скачать ${d.label ?? "файл"}`}
                    title="Скачать"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => clickDelete(d)}
                    aria-label={`Удалить ${d.label ?? "файл"}`}
                    title="Удалить"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function UploadDialog({
  onUpload,
  pending,
  progress,
}: {
  onUpload: (file: File, kind: DocumentKind, label: string) => Promise<void>
  pending: boolean
  progress: number
}) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<DocumentKind>("transcript")
  const [label, setLabel] = useState("")

  function reset() {
    setFile(null)
    setKind("transcript")
    setLabel("")
  }

  async function submit() {
    if (!file) return
    await onUpload(file, kind, label.trim() || file.name)
    reset()
    setOpen(false)
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline" className="gap-2 shrink-0">
        <Upload className="h-4 w-4 text-gold" />
        Загрузить
      </Button>
    )
  }

  return (
    <div className="w-full rounded-lg border border-gold/30 bg-gold/5 p-4 space-y-3">
      <label className="block">
        <span className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">Файл</span>
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) setFile(f)
          }}
          disabled={pending}
          className="mt-1 block w-full text-sm font-serif text-cream-2 file:mr-3 file:rounded-md file:border-0 file:bg-card file:px-3 file:py-1.5 file:text-xs file:font-mono-label file:text-cream-2 hover:file:bg-card/70 cursor-pointer"
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label>
          <span className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">Тип</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as DocumentKind)}
            disabled={pending}
            className="mt-1 block w-full h-8 rounded-md border border-border bg-card px-2 text-sm font-serif text-cream-2"
          >
            {(Object.keys(KIND_LABELS) as DocumentKind[]).map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">
            Подпись (опц.)
          </span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={pending}
            placeholder={file?.name ?? "Транскрипт 11 класс"}
            className="mt-1 block w-full h-8 rounded-md border border-border bg-card px-2 text-sm font-serif text-cream-2"
          />
        </label>
      </div>

      {pending && (
        <div className="space-y-1">
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className={cn("h-full bg-gold transition-all")}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="font-mono-label text-[10px] text-cream-3">Загрузка · {progress}%</p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => { reset(); setOpen(false) }} disabled={pending}>
          Отмена
        </Button>
        <Button onClick={submit} size="sm" disabled={!file || pending} className="gap-2">
          {pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Загружаю...</> : <><Upload className="h-3.5 w-3.5" /> Загрузить</>}
        </Button>
      </div>
    </div>
  )
}
