import type EventListing from '../types/event-listing.js'
import type SeasonIndexPageViewModel from '../types/season-index-page-view-model.js'
import type SeasonIndexSource from '../types/season-index-source.js'
import type SeasonTimelineEntry from '../types/season-timeline-entry.js'
import type SeasonalSlot from '../types/seasonal-slot.js'
import buildDateRangeLabel from './build-date-range-label.js'
import buildEventPagePath from './build-event-page-path.js'
import buildSeasonLabel from './build-season-label.js'
import renderInlineMarkdown from '../helpers/render-inline-markdown.js'

/**
 * Projects the season-index source into the view model the eta template consumes —
 * resolves the season label, year breadcrumb, and timeline entries.
 *
 * @param source - Season-index source: target slot and the events in it.
 * @returns View model ready for `buildSeasonIndexPage`.
 */
const buildSeasonIndexViewModel = (source: SeasonIndexSource): SeasonIndexPageViewModel => ({
  seasonLabel: buildSeasonLabel(source.slot.seasonalYear, source.slot.season),
  yearLabel: String(source.slot.seasonalYear),
  yearIndexPagePath: `${source.slot.seasonalYear}/index.html`,
  timelineEntries: source.eventsInSlot.map((event) => buildTimelineEntry(source.slot, event)),
})

/**
 * Builds a single timeline entry for an event in the slot.
 *
 * @param slot - Slot the event belongs to (for the path prefix).
 * @param event - Event listing for the row being projected.
 * @returns Pre-rendered entry for the eta template.
 */
const buildTimelineEntry = (slot: SeasonalSlot, event: EventListing): SeasonTimelineEntry => ({
  dateRangeLabel: buildDateRangeLabel(event.startDate, event.endDate),
  titleInlineHtml: renderInlineMarkdown(event.title),
  eventPagePath: buildEventPagePath(slot.seasonalYear, slot.season, event.position, event.slug),
})

export default buildSeasonIndexViewModel
