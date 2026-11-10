'use client'

import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

export default function MathText({ text }: { text: string }) {
  if (!text) return null

  // Разбиваем текст на части: обычный текст и формулы внутри $...$
  const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/g)

  return (
    <span>
      {parts.map((part, index) => {
        // Блочная формула ($$...$$)
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return (
            <div key={index} className="my-2">
              <BlockMath math={part.slice(2, -2)} />
            </div>
          )
        }
        // Строчная формула ($...$)
        if (part.startsWith('$') && part.endsWith('$')) {
          return <InlineMath key={index} math={part.slice(1, -1)} />
        }
        // Обычный текст
        return <span key={index}>{part}</span>
      })}
    </span>
  )
}
