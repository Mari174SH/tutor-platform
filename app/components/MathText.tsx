'use client'

import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

export default function MathText({ text }: { text: string }) {
  if (!text) return null

  // --- ФУНКЦИЯ ОЧИСТКИ ТЕКСТА ---
  const cleanText = (str: string) => {
    return str
      // Убираем дубли чисел (14 14 -> 14)
      .replace(/\b(\d+)\s+\1\b/g, '$1')
      // Убираем дубли градусов (78 ∘ 78 ∘ -> 78°)
      .replace(/(\d+)\s*∘\s*\1\s*∘/g, '$1°')
      // Убираем дубли букв (A B C D ABCD -> ABCD)
      .replace(/\b([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])\s+\1\2\3\4/g, '$1$2$3$4')
      // Убираем лишние пробелы
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Применяем очистку к тексту
  const cleaned = cleanText(text);

  // Разбиваем текст на части: обычный текст и формулы внутри $...$ или $$...$$
  const parts = cleaned.split(/(\$\$.*?\$\$|\$.*?\$)/g);

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
        // Обычный текст
        return <span key={index}>{part}</span>
      })}
    </span>
  )
}
