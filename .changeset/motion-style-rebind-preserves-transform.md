---
'@octanejs/motion': patch
---

Preserve animate/layout/drag transforms when style MotionValues rebind.

Style MotionValue effects now patch and remove individual transform
functions on the live CSS string instead of rebuilding from an empty
per-bind state, so foreign transforms survive adding or swapping a style
MotionValue after mount.
