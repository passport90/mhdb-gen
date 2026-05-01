import * as z from 'zod'
import type ParsedEventMeta from '../types/parsed-event-meta.js'

/** Zod schema ensuring an unknown value satisfies `ParsedEventMeta`. */
const parsedEventMetaSchema = z.object({
  seasonalYear: z.number().int(),
  season: z.number().int(),
  position: z.number().int(),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
}) satisfies z.ZodType<ParsedEventMeta>

export default parsedEventMetaSchema
