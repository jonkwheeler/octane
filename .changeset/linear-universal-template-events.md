---
'octane': patch
---

Keep fallback collapsed-template handler updates linear in the number of native
event sites by matching accepted listeners within each host's ordered event
range. A 2,048-site update dropped from 11.3 ms to 1.8 ms while preserving host
identity, atomic handler publication, nullable listeners, and teardown behavior.
