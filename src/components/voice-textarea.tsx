"use client"

import { useId, type TextareaHTMLAttributes } from "react"
import { VoiceInputButton } from "@/components/voice-input-button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * Unified Voice + Textarea pairing (U-7 from TZ_FULLSTACK.md).
 *
 * Replaces the ad-hoc layouts where each page positioned the mic button
 * differently. The mic now sits in the top-right corner of the textarea
 * field, with consistent sizing/spacing everywhere it's used.
 *
 * Use this whenever you have a textarea that should accept voice input.
 */
export type VoiceTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> & {
  label?: string
  description?: string
  /** Hint passed to Whisper to improve names/numbers accuracy */
  voiceHint?: string
  voiceMode?: "append" | "replace"
  onValueChange: (value: string) => void
  containerClassName?: string
}

export function VoiceTextarea({
  label,
  description,
  voiceHint,
  voiceMode = "append",
  onValueChange,
  containerClassName,
  className,
  id: idProp,
  value,
  ...textareaProps
}: VoiceTextareaProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const currentValue = (value as string | undefined) ?? ""

  function handleTranscript(text: string) {
    if (voiceMode === "replace") {
      onValueChange(text)
      return
    }
    const next = currentValue.trim() ? `${currentValue.trimEnd()} ${text}` : text
    onValueChange(next)
  }

  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label htmlFor={id} className="font-mono-label text-[11px] text-cream-3 uppercase tracking-wider">
            {label}
          </Label>
        </div>
      )}
      <div className="relative">
        <Textarea
          id={id}
          value={currentValue}
          onChange={(e) => onValueChange(e.target.value)}
          className={cn("pr-11", className)}
          {...textareaProps}
        />
        <div className="absolute top-1.5 right-1.5">
          <VoiceInputButton
            onTranscript={handleTranscript}
            mode={voiceMode}
            hint={voiceHint}
            size="sm"
          />
        </div>
      </div>
      {description && (
        <p className="font-serif text-[12px] text-cream-3 leading-relaxed">{description}</p>
      )}
    </div>
  )
}
