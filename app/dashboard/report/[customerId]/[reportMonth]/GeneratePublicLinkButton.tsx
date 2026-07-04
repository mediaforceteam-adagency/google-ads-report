'use client'

import { useState } from 'react'

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export default function GeneratePublicLinkButton({
  customerId,
  reportMonth,
}: {
  customerId: string
  reportMonth: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    const url = `${window.location.origin}/report/${encodeURIComponent(customerId)}/${reportMonth}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      fallbackCopy(url)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="px-5 py-2 bg-[#F5A623] hover:bg-[#e0941f] text-white text-sm font-semibold rounded-lg transition shrink-0"
      >
        🔗 Generate Public Link
      </button>
      {copied && (
        <div className="absolute top-full right-0 mt-2 whitespace-nowrap bg-[#194A6A] text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg z-20">
          Link copied! Share with client.
        </div>
      )}
    </div>
  )
}
