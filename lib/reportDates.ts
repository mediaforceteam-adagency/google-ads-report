// dbMonth is always "YYYY-MM-01".

function parseDbMonth(dbMonth: string): [number, number] {
  const [y, m] = dbMonth.split('-').map(Number)
  return [y, m]
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function dateRangeLabel(dbMonth: string) {
  const [y, m] = parseDbMonth(dbMonth)
  const monthName = new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long' })
  const last = daysInMonth(y, m)
  return `${monthName} 1-${last}, ${y}`
}

export function prevDbMonth(dbMonth: string) {
  const [y, m] = parseDbMonth(dbMonth)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function monthLabel(dbMonth: string) {
  const [y, m] = parseDbMonth(dbMonth)
  return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function monthShort(dbMonth: string) {
  const [y, m] = parseDbMonth(dbMonth)
  return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short' })
}
