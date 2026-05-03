import type Controller from '../types/controller.js'

/**
 * Reconciles the HTML output tree to current DB state — re-renders events whose `rendered_at`
 * is stale, refreshes hierarchical indexes, mirrors static assets, and removes orphan output
 * folders. Not yet implemented.
 *
 * @returns Exit code; `0` on success, non-zero on failure.
 */
const sync: Controller = () => {
  throw new Error('sync: not yet implemented')
}

export default sync
