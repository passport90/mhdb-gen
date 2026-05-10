import type EventLink from '../types/event-link.js'
import type EventPageViewModel from '../types/event-page-view-model.js'
import type EventToRender from '../types/event-to-render.js'
import SEASON_NAME_BY_NUMBER from '../constants/season-names.js'
import buildDateRangeLabel from './build-date-range-label.js'
import buildUpdatedAtLabel from './build-updated-at-label.js'
import { marked } from 'marked'

/** Relative path from an event page (depth 3) up to the output root. */
const EVENT_PAGE_ROOT_BASE_PATH = '../../../'

/** Filename used for every bundled illustration; sibling to the event's `index.html`. */
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
  illustrationFileName: event.illustrationHash !== null ? ILLUSTRATION_FILE_NAME : null,
  descriptionHtml: marked.parse(event.description, { async: false }).trimEnd(),
  siblingNavigation: {
    prevLink: buildSiblingLink(prevEvent),
    nextLink: buildSiblingLink(nextEvent),
  },
  updatedAtLabel: buildUpdatedAtLabel(event.updatedAt),
  rootBasePath: EVENT_PAGE_ROOT_BASE_PATH,
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
 * Root-relative URL of a season's index page.
 *
 * @param year - Seasonal year.
 * @param season - Season number.
 * @returns Season index page URL.
 */
const buildSeasonIndexPagePath = (year: number, season: number): string => `${year}/${season}/index.html`

/**
 * Builds the human-readable season label, e.g. `Spring 2026`.
 *
 * @param year - Seasonal year.
 * @param season - Season number in the SQL domain (0–3).
 * @returns Label combining the season name and the year.
 */
const buildSeasonLabel = (year: number, season: number): string => `${SEASON_NAME_BY_NUMBER[season]} ${year}`

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
 * Renders inline markdown to HTML — no wrapping `<p>` tag.
 *
 * @param text - Markdown source.
 * @returns Inline HTML fragment.
 */
const renderInlineMarkdown = (text: string): string => marked.parseInline(text, { async: false })

/**
 * Strips inline emphasis markers (`*`, `_`, `` ` ``) from `text`, leaving plain text.
 *
 * @param text - Inline markdown source.
 * @returns Plain text with emphasis markers removed.
 */
const stripInlineMarkdown = (text: string): string => text.replace(/[*_`]/g, '')

export default buildEventViewModel
