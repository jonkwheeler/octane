---
'@octanejs/motion': patch
---

Preserve host styles and layout FLIP transforms across style MotionValue rebinds.

Style MotionValue effects patch and remove individual transform functions on the
live CSS string instead of rebuilding from an empty per-bind state, update
compound `translate(...)` / `scale(...)` layout FLIP forms in place rather than
stacking parallel shorthands, and leave plain static style values alone when a
key switches from a MotionValue to a host-owned value.
