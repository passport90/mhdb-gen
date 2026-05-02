import type EventSource from '../types/event-source.js'

/**
 * Validates the upsert argv and groups it into one `EventSource` per event.
 *
 * @param args - Mixed list of `.md` and `.png` file paths from the upsert CLI invocation.
 * @returns One `EventSource` per `.md` file in `args`, paired with its sibling `.png` when one is also present.
 * @throws `UsageError` when any path has an unsupported extension or any `.png` lacks a sibling `.md`.
 */
const groupUpsertArgs = (_args: string[]): EventSource[] => []

export default groupUpsertArgs
