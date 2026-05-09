import { Eta } from 'eta'
import type EventPageViewModel from '../types/event-page-view-model.js'
import { fileURLToPath } from 'node:url'

/** Filesystem path to the templates directory; resolved relative to this compiled module. */
const TEMPLATE_DIR_PATH = fileURLToPath(new URL('../templates/', import.meta.url))

/** Eta engine configured to load `.eta` templates from `TEMPLATE_DIR_PATH`. */
const ETA_ENGINE = new Eta({ views: TEMPLATE_DIR_PATH })

/**
 * Applies the eta event template to the view model.
 *
 * @param viewModel - Pre-resolved view model — paths, labels, rendered HTML already in place.
 * @returns Full HTML document for the event's page.
 */
const buildEventPage = (viewModel: EventPageViewModel): string =>
  ETA_ENGINE.render('event', viewModel)

export default buildEventPage
