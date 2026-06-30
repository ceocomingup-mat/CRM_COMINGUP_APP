// Awatar inicjałów (jak w prototypie) — mosiężny krążek z inicjałami.
export default function Avatar({ name, className = '' }: { name: string; className?: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brass/15 text-xs font-bold text-brass ${className}`}
    >
      {initials || '?'}
    </span>
  )
}
