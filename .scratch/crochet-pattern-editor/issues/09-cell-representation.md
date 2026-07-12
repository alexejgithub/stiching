# Cell representation

Type: grilling
Status: resolved

## Question

Should a cell carry a symbol in addition to color, or is color alone enough to identify yarn in a cell?

## Answer

Color + auto-assigned symbol: every palette entry gets a distinct symbol (dot, cross, triangle, etc.) shown in the cell alongside its color. This is a deliberate v1 inclusion despite the "ASAP" goal, because the SVG export/print is meant to be used standalone with yarn in hand — color-only cells become ambiguous on a black-and-white printout or for a colorblind reader, and retrofitting symbols into an already-shipped data model and export pipeline is much more expensive than building it in from the start.
