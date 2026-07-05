/** Credits consumed per second of active stream time. */
export const CREDITS_PER_SECOND = 2

/** One-time credit packs (NGN). Amount is in kobo (₦ × 100). */
export const CREDIT_PACKS: Record<string, { credits: number; amountKobo: number }> = {
  '1000': { credits: 1000, amountKobo: 2_900_000 },
  '2000': { credits: 2000, amountKobo: 5_800_000 },
  '5000': { credits: 5000, amountKobo: 14_500_000 },
  '10000': { credits: 10000, amountKobo: 29_000_000 }
}

export function isValidPackId(packId: string): packId is keyof typeof CREDIT_PACKS {
  return packId in CREDIT_PACKS
}

/** Approximate stream time at 2 credits/second, e.g. "~8m 20s". */
export function formatStreamEstimate(credits: number): string {
  const totalSeconds = Math.floor(credits / CREDITS_PER_SECOND)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `~${seconds}s`
  if (seconds === 0) return `~${minutes}m`
  return `~${minutes}m ${seconds}s`
}
