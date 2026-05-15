import type SeasonIndexPageViewModel from '../types/season-index-page-view-model.js'
import type SeasonLink from '../types/season-link.js'
import type SeasonTimelineEntry from '../types/season-timeline-entry.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import type TimelineEvent from '../types/timeline-event.js'
import buildDateRangeLabel from './build-date-range-label.js'
import buildSeasonLabel from './build-season-label.js'
import renderInlineMarkdown from '../helpers/render-inline-markdown.js'

/**
 * Projects a slot, its events, and adjacent slots into the season-index view model the eta template
 * consumes — resolves the season label, year breadcrumb, timeline entries, and prev/next season
 * links.
 *
 * @param slot - Seasonal slot of the page.
 * @param events - Events in the slot, in position order.
 * @param prevSlot - Previous slot with events, or `null` when none.
 * @param nextSlot - Next slot with events, or `null` when none.
 * @returns View model ready for `buildSeasonIndexPage`.
 */
const buildSeasonIndexViewModel = (
  slot: SeasonalSlot,
  events: TimelineEvent[],
  prevSlot: SeasonalSlot | null,
  nextSlot: SeasonalSlot | null,
): SeasonIndexPageViewModel => ({
  seasonLabel: buildSeasonLabel(slot.seasonalYear, slot.season),
  yearLabel: String(slot.seasonalYear),
  yearIndexPagePath: `${slot.seasonalYear}/index.html`,
  timelineEntries: events.map((event) => buildTimelineEntry(slot, event)),
  prevSeasonLink: buildSeasonLink(prevSlot),
  nextSeasonLink: buildSeasonLink(nextSlot),
})

/**
 * Builds a link to a season's index page.
 *
 * @param slot - Seasonal slot being linked to, or `null` to short-circuit.
 * @returns Link with display label and root-relative URL, or `null` when `slot` is `null`.
 */
const buildSeasonLink = (slot: SeasonalSlot | null): SeasonLink | null => {
  if (slot === null) return null

  return {
    label: buildSeasonLabel(slot.seasonalYear, slot.season),
    indexPagePath: `${slot.seasonalYear}/${slot.season}/index.html`,
  }
}

/**
 * Builds a single timeline entry for an event in the slot.
 *
 * @param slot - Slot the event belongs to (for the path prefix).
 * @param event - Skinny event row.
 * @returns Pre-rendered entry for the eta template.
 */
const buildTimelineEntry = (slot: SeasonalSlot, event: TimelineEvent): SeasonTimelineEntry => ({
  dateRangeLabel: buildDateRangeLabel(event.startDate, event.endDate),
  titleInlineHtml: renderInlineMarkdown(event.title),
  eventPagePath: `${slot.seasonalYear}/${slot.season}/${event.position}-${event.slug}/index.html`,
})

export default buildSeasonIndexViewModel
