export function bulletText(items: string[] | undefined) {
  return (items ?? []).map((item) => `• ${item}`).join('\n')
}
