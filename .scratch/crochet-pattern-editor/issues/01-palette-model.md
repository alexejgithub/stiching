# Palette model

Type: grilling
Status: resolved

## Question

Should the color palette be freeform (any hex color, user names it) or modeled after real yarn systems (specific yarn brand/weight color codes)?

## Answer

Freeform for v1: each palette entry is a hex value plus a user-given label. But the entry is modeled as a distinct object (not a bare color) — hex, label, and room for a future "linked yarn SKU" field — so real yarn-catalog linking can be added later (see the map's Out of scope note; target catalog to eventually link against is lieblingsgarn.de) without migrating every saved pattern's palette.
