'use client'

import { useRouter } from 'next/navigation'

function formatMonth(dateStr: string) {
  const [year, month] = dateStr.split('-').map(Number)
  return new Date(year, month - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export default function MonthSelector({
  customerId,
  currentMonth,
  availableMonths,
}: {
  customerId: string
  currentMonth: string
  availableMonths: string[]
}) {
  const router = useRouter()

  return (
    <select
      value={currentMonth}
      onChange={(e) =>
        router.push(
          `/dashboard/report/${encodeURIComponent(customerId)}/${e.target.value}`
        )
      }
      className="text-sm border border-[#dce6f5] rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition cursor-pointer"
    >
      {availableMonths.map((m) => (
        <option key={m} value={m}>
          {formatMonth(m)}
        </option>
      ))}
    </select>
  )
}
