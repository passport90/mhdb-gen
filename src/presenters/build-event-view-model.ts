import type EventPageViewModel from '../types/event-page-view-model.js'
import type EventToRender from '../types/event-to-render.js'
import SEASON_PATH_SEGMENTS from '../constants/season-path-segments.js'
import buildDateRangeLabel from './build-date-range-label.js'
import buildSeasonIndexPagePath from './build-season-index-page-path.js'
import buildSeasonLabel from './build-season-label.js'
import buildUpdatedAtLabel from './build-updated-at-label.js'
import { marked } from 'marked'
import renderInlineMarkdown from '../helpers/render-inline-markdown.js'

/** Filename written to disk by `render-event` and served back to the browser. Sibling to the event's `index.html`. */
const ILLUSTRATION_FILE_NAME = 'illustration.png'

/**
 * Projects a hydrated event into the view model the eta template consumes — resolves paths, labels,
 * the date range, and the rendered description HTML.
 *
 * @param event - Event being rendered.
 * @returns View model ready for `buildEventPage`.
 */
const buildEventViewModel = (event: EventToRender): EventPageViewModel => ({
  title: {
    inlineHtml: renderInlineMarkdown(event.title),
    plainText: stripInlineMarkdown(event.title),
  },
  breadcrumb: {
    year: {
      label: String(event.seasonalYear),
      indexPagePath: buildYearIndexPagePath(event.seasonalYear),
    },
    season: {
      label: buildSeasonLabel(event.seasonalYear, event.season),
      indexPagePath: buildSeasonIndexPagePath(event.seasonalYear, event.season),
    },
  },
  dateRangeLabel: buildDateRangeLabel(event.startDate, event.endDate),
  illustrationPath: event.illustrationHash !== null
    ? buildIllustrationPath(event.seasonalYear, event.season, event.position, event.slug)
    : null,
  descriptionHtml: marked.parse(event.description, { async: false }).trimEnd(),
  generatedBy: event.generatedBy,
  updatedAtLabel: buildUpdatedAtLabel(event.updatedAt),
})

/**
 * Root-relative URL of an event's bundled illustration, e.g.
 * `1066/3-fall/1-battle-of-hastings/illustration.png`.
 *
 * @param year - Event's seasonal year.
 * @param season - Event's season number.
 * @param position - Event's position within its season; the prefix in the bundle name.
 * @param slug - Event's slug.
 * @returns Illustration URL.
 */
const buildIllustrationPath = (year: number, season: number, position: number, slug: string): string =>
  `${year}/${SEASON_PATH_SEGMENTS[season]}/${position}-${slug}/${ILLUSTRATION_FILE_NAME}`

/**
 * Root-relative URL of a year's index page.
 *
 * @param year - Seasonal year.
 * @returns Year index page URL.
 */
const buildYearIndexPagePath = (year: number): string => `${year}/index.html`

/**
 * Strips inline emphasis markers (`*`, `_`, `` ` ``) from `text`, leaving plain text.
 *
 * @param text - Inline markdown source.
 * @returns Plain text with emphasis markers removed.
 */
const stripInlineMarkdown = (text: string): string => text.replace(/[*_`]/g, '')

export default buildEventViewModel
