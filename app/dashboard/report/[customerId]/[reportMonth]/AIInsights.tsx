'use client'

import { useState } from 'react'

export default function AIInsights() {
  const [prompt, setPrompt] = useState('')
  const [generated, setGenerated] = useState('')
  const [copied, setCopied] = useState(false)

  // TODO: wire up to /api/insights once that route exists — currently a UI-only stub.
  function handleGenerate() {}

  async function handleCopy() {
    if (!generated) return
    await navigator.clipboard.writeText(generated)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Write executive summary comparing June vs May"
          rows={3}
          className="w-full text-sm text-gray-800 border border-[#dce6f5] rounded-lg px-3 py-2 resize-none outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 placeholder-gray-400 transition"
        />
      </div>

      <button
        onClick={handleGenerate}
        className="px-5 py-2.5 bg-[#F5A623] hover:bg-[#e0941f] text-white text-sm font-semibold rounded-lg transition"
      >
        Generate Insights
      </button>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Generated Insights
        </label>
        <textarea
          value={generated}
          onChange={(e) => setGenerated(e.target.value)}
          placeholder="Generated insights will appear here…"
          rows={6}
          className="w-full text-sm text-gray-800 border border-[#dce6f5] rounded-lg px-3 py-2 resize-none outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 placeholder-gray-400 transition"
        />
      </div>

      <button
        onClick={handleCopy}
        className="px-5 py-2.5 bg-navy hover:bg-navy-dark text-white text-sm font-semibold rounded-lg transition"
      >
        {copied ? 'Copied!' : 'Copy Insights'}
      </button>
    </div>
  )
}
