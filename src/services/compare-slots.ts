import type SeasonalSlot from '../types/seasonal-slot.js'

/**
 * Compares two slots in `(year, season)` lex order. Returns only the sign — never the
 * arithmetic difference — so the result cannot be mistaken for a year delta or a season
 * delta depending on which dimension differentiated the inputs.
 *
 * @param a - First slot.
 * @param b - Second slot.
 * @returns `-1` when `a` precedes `b`, `0` when equal, `1` when `a` follows.
 */
const compareSlots = (a: SeasonalSlot, b: SeasonalSlot): -1 | 0 | 1 => {
  if (a.seasonalYear !== b.seasonalYear) return a.seasonalYear < b.seasonalYear ? -1 : 1
  if (a.season !== b.season) return a.season < b.season ? -1 : 1

  return 0
}

export default compareSlots
