// Small display helpers: relative times, dates and domains.
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const steps: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

const shortDate = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatDate(iso: string): string {
  return shortDate.format(new Date(iso))
}

export function domainOf(baseUrl: string): string {
  return baseUrl.replace(/^https?:\/\//, '')
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}
