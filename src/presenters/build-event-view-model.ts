import type EventLink from '../types/event-link.js'
import type EventPageViewModel from '../types/event-page-view-model.js'
import type EventToRender from '../types/event-to-render.js'
import buildDateRangeLabel from './build-date-range-label.js'
import buildSeasonLabel from './build-season-label.js'
import buildUpdatedAtLabel from './build-updated-at-label.js'
import { marked } from 'marked'
import renderInlineMarkdown from '../helpers/render-inline-markdown.js'

/** Filename written to disk by `render-event` and served back to the browser. Sibling to the event's `index.html`. */
const ILLUSTRATION_FILE_NAME = 'illustration.png'

/**
 * Projects a hydrated event plus its in-season neighbors into the view model the eta template consumes
 * — resolves paths, labels, the date range, the rendered description HTML, and the prev/next links.
 *
 * @param event - Event being rendered.
 * @param prevEvent - Previous event in the same season, or `null` at the start of the season.
 * @param nextEvent - Next event in the same season, or `null` at the end of the season.
 * @returns View model ready for `buildEventPage`.
 */
const buildEventViewModel = (
  event: EventToRender,
  prevEvent: EventToRender | null,
  nextEvent: EventToRender | null,
): EventPageViewModel => ({
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
    ? buildIllustrationPath(event.seasonalYear, event.season, event.slug)
    : null,
  descriptionHtml: marked.parse(event.description, { async: false }).trimEnd(),
  siblingNavigation: {
    prevLink: buildSiblingLink(prevEvent),
    nextLink: buildSiblingLink(nextEvent),
  },
  updatedAtLabel: buildUpdatedAtLabel(event.updatedAt),
})

/**
 * Root-relative URL of an event's page, e.g. `1066/3/battle-of-hastings/index.html`.
 *
 * @param year - Event's seasonal year.
 * @param season - Event's season number.
 * @param slug - Event's slug.
 * @returns Event page URL.
 */
const buildEventPagePath = (year: number, season: number, slug: string): string =>
  `${year}/${season}/${slug}/index.html`

/**
 * Root-relative URL of an event's bundled illustration, e.g. `1066/3/battle-of-hastings/illustration.png`.
 *
 * @param year - Event's seasonal year.
 * @param season - Event's season number.
 * @param slug - Event's slug.
 * @returns Illustration URL.
 */
const buildIllustrationPath = (year: number, season: number, slug: string): string =>
  `${year}/${season}/${slug}/${ILLUSTRATION_FILE_NAME}`

/**
 * Root-relative URL of a season's index page.
 *
 * @param year - Seasonal year.
 * @param season - Season number.
 * @returns Season index page URL.
 */
const buildSeasonIndexPagePath = (year: number, season: number): string => `${year}/${season}/index.html`

/**
 * Builds an `EventLink` for an in-season neighbor — the path to its bundle plus its inline-rendered title.
 *
 * @param siblingEvent - In-season neighbor, or `null` when there is none on that side.
 * @returns Link to the neighbor's bundle, or `null` when `siblingEvent` is `null`.
 */
const buildSiblingLink = (siblingEvent: EventToRender | null): EventLink | null => {
  if (siblingEvent === null) return null

  return {
    path: buildEventPagePath(siblingEvent.seasonalYear, siblingEvent.season, siblingEvent.slug),
    titleInlineHtml: renderInlineMarkdown(siblingEvent.title),
  }
}

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
