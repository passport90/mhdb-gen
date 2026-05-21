/**
 * Compares two numbers. Returns only the sign — never the arithmetic difference — so the
 * result is safe to thread through callers expecting a tri-state `-1 | 0 | 1` comparator
 * (`Array.prototype.sort`, `findLowerBound`, etc.) without leaking magnitude.
 *
 * @param a - First number.
 * @param b - Second number.
 * @returns `-1` when `a < b`, `0` when equal, `1` when `a > b`.
 */
const compareNumbers = (a: number, b: number): -1 | 0 | 1 => {
  if (a < b) return -1
  if (a > b) return 1

  return 0
}

export default compareNumbers
