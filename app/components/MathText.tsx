'use client'

import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

export default function MathText({ text }: { text: string }) {
  if (!text) return null

  // 1. Сначала разбиваем текст на части: обычный текст и формулы внутри $...$ или $$...$$
  const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/g)

  return (
    <span>
      {parts.map((part, index) => {
        // Блочная формула ($$...$$)
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return (
            <div key={index} className="my-2 overflow-x-auto">
              <BlockMath math={part.slice(2, -2)} />
            </div>
          )
        }
        // Строчная формула ($...$)
        if (part.startsWith('$') && part.endsWith('$')) {
          return <InlineMath key={index} math={part.slice(1, -1)} />
        }
        
        // Обычный текст: обрабатываем переносы строк
        // Заменяем \n на <br /> и разбиваем на массив строк
        const lines = part.split('\n');
        return (
          <span key={index}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
              </span>
            ))}
          </span>
        )
      })}
    </span>
  )
}
