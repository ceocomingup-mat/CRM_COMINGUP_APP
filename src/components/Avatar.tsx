// Awatar inicjałów (jak w prototypie) — mosiężny krążek z inicjałami.
export default function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'lg' }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const dim = size === 'lg' ? 'h-12 w-12 text-base' : 'h-8 w-8 text-xs'
  return (
    <span
      className={`grid ${dim} shrink-0 place-items-center rounded-full bg-brass/15 font-bold text-brass`}
    >
      {initials || '?'}
    </span>
  )
}
