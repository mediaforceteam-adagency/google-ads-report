export function bulletText(items: string[] | undefined) {
  return (items ?? []).map((item) => `• ${item}`).join('\n')
}

// Bullet text is stored as "• item" lines (see bulletText above); split it
// back into discrete items so it can be rendered as a list again.
export function parseBullets(text: string | undefined): string[] {
  return (text ?? '')
    .split('\n')
    .map((line) => line.replace(/^[•\s]+/, '').trim())
    .filter(Boolean)
}
