/** Credits consumed per second of active stream time. */
export const CREDITS_PER_SECOND = 2

export interface CreditPack {
  id: string
  credits: number
  priceNgn: number
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: '1000', credits: 1000, priceNgn: 29_000 },
  { id: '2000', credits: 2000, priceNgn: 58_000 },
  { id: '5000', credits: 5000, priceNgn: 145_000 },
  { id: '10000', credits: 10000, priceNgn: 290_000 }
]

/** Approximate stream time at 2 credits/second, e.g. "~8m 20s". */
export function formatStreamEstimate(credits: number): string {
  const totalSeconds = Math.floor(credits / CREDITS_PER_SECOND)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `~${seconds}s`
  if (seconds === 0) return `~${minutes}m`
  return `~${minutes}m ${seconds}s`
}

export function formatNgn(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`
}

export function formatCredits(amount: number): string {
  return amount.toLocaleString('en-NG')
}
