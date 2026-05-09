// Tipos de aula. Hoje só "junior_books"; novos verticais (manim/math, etc.)
// entram aqui sem mexer em nada do mural.

export const LESSON_TYPES = {
  junior_books: {
    slug: "junior_books",
    label: "Book",
    tagline: "criar um livro animado com personagens, objetos, cenários e cenas",
  },
  essay: {
    slug: "essay",
    label: "Redação",
    tagline: "redação dissertativa com tutoria por chat",
  },
  math_manim: {
    slug: "math_manim",
    label: "Math",
    tagline: "matemática com tutor socrático — Manim animado virá depois",
  },
} as const;

export type LessonTypeSlug = keyof typeof LESSON_TYPES;

export function lessonLabel(slug: string): string {
  if (slug in LESSON_TYPES) return LESSON_TYPES[slug as LessonTypeSlug].label;
  return slug;
}
