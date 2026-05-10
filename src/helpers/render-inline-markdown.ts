import { marked } from 'marked'

/**
 * Renders inline markdown to HTML — no wrapping `<p>` tag.
 *
 * @param text - Inline markdown source.
 * @returns Inline HTML fragment.
 */
const renderInlineMarkdown = (text: string): string => marked.parseInline(text, { async: false })

export default renderInlineMarkdown
