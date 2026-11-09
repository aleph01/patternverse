# Expanded library and feedback — 28 October 2026

Release approved for https://patternverse.org. Production deployment: `3abcab21-f67e-4deb-a968-063c18a6320f` ([deployment snapshot](https://3abcab21.patternverse.pages.dev)); previous deployment: `4e7e10a5-5104-420d-a074-f82223f3caa2`. Final verification details are recorded in `.local/releases/expanded-library-2026-10-28/release-report.json`.

The public library expands from 627 to 988 entries. The selection includes Graphic Design (39 patterns), Machine Learning (53 articles and 51 explorers), Agentic Coding (18 patterns), Data Engineering (181 articles across 12 families), Teamwork (16 patterns), Systemic Therapy Essentials (7 articles), Yoga Nidra, and the Life Strategies additions: Barbell Strategy, its companion practice, and the expanded Smallest Useful Experiment article. Stoicism, Systemic Therapy, and Yoga Nidra belong to Therapy & Wellbeing.

The reader has compact Contents and collection navigation with fewer dividers. Areas and their Verses are alphabetical. Search retains the current improvements. Deployment recovery allows new visits, including search-engine links, to reach the current website while older editing tabs retain their draft and matching resources. Service workers activate without automatically reloading open tabs.

Article feedback supports quick categories, passage comments, text and link suggestions, review before submission, draft recovery, and retry without duplicate submissions. The separate `patternverse-article-contributions` service stores submissions privately in an EU-jurisdiction D1 database. The owner inbox is available at `/owner/contributions` behind existing Cloudflare Access protection and independent owner JWT verification. Editorial approval does not automatically publish changes. The public privacy notice describes this storage. No feedback emails are sent.

All existing public Markdown outside the selected entries is byte-for-byte preserved from the prior release. Bearings, Tender Wilds, songwriting, the Engineering Verse, and unselected therapy work remain excluded. Original Data Engineering and Teamwork source prose and illustration provenance are retained in `docs/pattern-packages/`.

The release is built from an isolated source snapshot. Type checking, public-output scanning, deployment safeguards, 923 server/content tests, 100 UI/navigation checks, and 17 feedback service tests pass after updating publication assertions. Desktop and phone browser checks cover the imported articles, figures, navigation, search, offline reading, recovery across deployments, and feedback editing/submission. Live submission and duplicate protection are checked against the dedicated database; labeled release tests are archived.

The reviewed website artifact contains 6,982 files (including hosting headers), with fingerprint `73e28d5b96ecdb9f73ede9c449756a7171f86f5ca0112aa3212e5023d6d95cfb`. Hosting preserves literal HTML and JSON bytes so examples and offline fingerprints remain intact. Exact artifacts, source inventory, checks, screenshots, deployment receipts and verification results are retained in `.local/releases/expanded-library-2026-10-28/`.

No Git push or pull request is part of this release.

Production verification passed all 7,138 checks. Every hosted page and asset matches the reviewed build, and excluded entity paths return 404. Desktop and phone checks pass on production; feedback sent through the published Yoga Nidra page reached the private inbox and its release-test record was archived.
