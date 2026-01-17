# Reader Mode Heuristics (Summary)

## Core flow

1. Parse DOM
2. Identify main content container
3. Remove noise (nav, ads, sidebar, comments)
4. Reflow/normalize styles
5. Preserve semantics (title, paragraphs, images, lists)

## Heuristic signals

- Text density: long continuous text blocks score higher; heavy links/forms score lower.
- Semantic tags: article/main/section/p score higher than generic div.
- Class/ID keywords: positive (article, content, post, entry, main, body); negative (nav, menu, footer, header, sidebar, comment, ad, promo).
- Link density: high ratio of link text to total text indicates navigation/related content.
- Structural continuity: stable child node types, fewer hard breaks, vertical flow.
- Media handling: keep inline images; remove carousels/related blocks; figure/figcaption scores higher.

## Scoring model (conceptual)

Score(node) =
  text length
+ semantic weight
+ structure continuity
- link density
- noise keywords

Highest score node is treated as the main article container.

## Common failure causes

- Content injected dynamically (JS)
- Flat div-only layouts
- Content fragmented into tiny nodes
- Ads mixed with content
- Non-article pages (tools/forums)
