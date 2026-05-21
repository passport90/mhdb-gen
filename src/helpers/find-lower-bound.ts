/**
 * Finds the lower bound of `target` in `sortedArray` under `compare` — the smallest index
 * `i` in `[0, sortedArray.length]` such that `compare(sortedArray[i], target) >= 0`.
 * Returns `sortedArray.length` when every element compares less than the target, and `0`
 * for an empty array. Equivalent to C++'s `std::lower_bound`.
 *
 * The comparator is asymmetric on purpose: `Element` and `Target` can differ. This lets
 * callers binary-search a sorted array of records by a key derived from each record,
 * without materialising an intermediate keys-only array. When the symmetric case is
 * wanted, instantiate `Element` and `Target` to the same type.
 *
 * When the target already matches an element under `compare`, the returned index points at
 * the leftmost match — callers needing the closest strictly-greater element must skip past
 * matches themselves.
 *
 * Time complexity O(log n). Caller is responsible for `sortedArray` actually being sorted
 * ascending under `compare`; mis-sorted input yields undefined output.
 *
 * @param sortedArray - Array sorted ascending under `compare`.
 * @param target - Value whose lower bound is being located.
 * @param compare - Tri-state comparator returning `-1`, `0`, or `1`.
 * @returns Lower-bound index in `[0, sortedArray.length]`.
 */
const findLowerBound = <Element, Target>(
  sortedArray: Element[],
  target: Target,
  compare: (a: Element, b: Target) => -1 | 0 | 1,
): number => {
  /** Inclusive lower bound of the search window. */
  let low = 0

  /** Exclusive upper bound of the search window. */
  let high = sortedArray.length

  while (low < high) {
    /** Midpoint of the current window; unsigned shift avoids overflow on large arrays. */
    const mid = (low + high) >>> 1
    if (compare(sortedArray[mid], target) < 0) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  return low
}

export default findLowerBound
