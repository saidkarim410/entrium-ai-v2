"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-entrium", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="font-display text-2xl mt-6 mb-3 first:mt-0" {...p} />,
          h2: (p) => <h2 className="font-display text-xl text-gold mt-6 mb-3 first:mt-0" {...p} />,
          h3: (p) => <h3 className="font-display text-lg mt-4 mb-2" {...p} />,
          p: (p) => <p className="font-serif text-cream-2 text-[15px] leading-[1.85] mb-3" {...p} />,
          ul: (p) => <ul className="list-disc pl-6 space-y-1.5 mb-4 font-serif text-cream-2" {...p} />,
          ol: (p) => <ol className="list-decimal pl-6 space-y-1.5 mb-4 font-serif text-cream-2" {...p} />,
          li: (p) => <li className="leading-relaxed" {...p} />,
          strong: (p) => <strong className="text-cream font-semibold" {...p} />,
          em: (p) => <em className="text-gold-soft" {...p} />,
          code: ({ className: cn2, ...rest }) =>
            cn2 ? (
              <code className={cn(cn2, "bg-card border border-border rounded px-1 py-0.5 text-sm")} {...rest} />
            ) : (
              <code className="bg-card border border-border rounded px-1.5 py-0.5 text-xs font-mono" {...rest} />
            ),
          pre: (p) => <pre className="bg-card border border-border rounded-md p-4 overflow-x-auto text-xs my-4" {...p} />,
          blockquote: (p) => <blockquote className="border-l-2 border-gold pl-4 italic text-cream-3 my-3" {...p} />,
          a: (p) => <a className="text-gold hover:underline" target="_blank" rel="noopener noreferrer" {...p} />,
          table: (p) => <table className="border-collapse border border-border my-4 w-full text-sm" {...p} />,
          th: (p) => <th className="border border-border bg-card px-3 py-2 text-left font-mono-label text-cream-3" {...p} />,
          td: (p) => <td className="border border-border px-3 py-2 font-serif text-cream-2" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
