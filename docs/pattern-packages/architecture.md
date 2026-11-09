# Architecture verse: editorial and verification record

Created 27 October 2026 in the existing Patternverse application. Scope: physical buildings and spaces.

## Delivered

- 36 canonical field guides, approximately 35,200 words of article prose. The local validator excludes figure captions, recommendation situations and source lists from the 800–1,500-word check.
- Ten topic collections under Place, Space, Fabric and Practice, plus four grouping collections and the Architecture Field Guide index.
- 155 distinct teaching visuals: 108 original SVG diagrams and 47 photographs of real buildings, spaces, construction and design processes. The photographs appear in 61 placements, giving every article one or two photographic examples. Each diagram also has a compact companion for the existing responsive renderer; companions are not counted as additional teaching visuals.
- No guided practices. Architecture is an illustrated article collection.
- Eight realistic recommendation situations per pattern, available both in structured metadata and the existing full-text corpus. Scale, building type and concerns use existing indexed tags.
- Shared canonical articles across relevant collections, resolved related-pattern links and existing search, verse and collection navigation. No new dependency or recommendation service.

Open `/collection/architecture-field-guide` in the application, or select Architecture in the Library.

## Shared article outline

All 36 guides follow the same H2 sequence: What it is for; The core idea; How it works; Why it works; Architectural examples; Design considerations; Useful when; Common mistakes and limits; Related patterns; Sources and provenance.

“How it works” gives a short operational explanation specific to the pattern; “Why it works” explains the underlying spatial or environmental relationships. Examples retain individual H3 headings that distinguish named precedents, contextual comparisons and illustrative scenarios. Photographs, diagrams and caveats sit beside the cases or relationships they explain. The existing desktop and phone contents navigation uses this heading structure directly.

The outline revision retained the original article prose, figures, credits, recommendation situations and sources. The [outline review](architecture-outline-review.json) records per-article preservation checks and before/after checksums. The package metadata owns the shared heading vocabulary, with validation and rendering tests guarding its order and navigable section anchors. Architecture contains no guided practices.

## Taxonomy

| Group    | Topic collections                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------- |
| Place    | Site, Context & Landscape; Public Realm & Building Edges; Building Form & Massing                  |
| Space    | Spatial Organization & Program; Circulation, Access & Wayfinding; Human Scale & Spatial Experience |
| Fabric   | Light, Climate & Comfort; Structure, Materials & Details; Adaptability, Reuse & Longevity          |
| Practice | Architectural Design Process                                                                       |

The starting inventory contained 588 patterns and no physical-architecture verse. The software Prototype article is a GoF object-creation pattern, distinct from architectural full-scale testing. Existing general experiment and alternative-path articles remain canonical and are linked from the building-specific guides.

## Research and authorship

The [source registry and curated metadata](architecture.json) contain 50 source entries and the complete master list. Nineteen guides preserve established names and provenance: selected Alexander patterns, Prospect and Refuge from Browning, Ryan and Clancy, and Shearing Layers from Brand's work developing Duffy's time-layer model. Seventeen are identified as modern editorial syntheses.

Core references include [A Pattern Language's published summary](https://www.patternlanguage.com/apl/aplsummary.htm), the [Christopher Alexander and CES Archive](https://christopher-alexander-ces-archive.org/), [Ching's publisher overview and contents](https://www.wiley.com/en-us/architecture-form-space-and-order-5th-edition-p-9781119853374), [Terrapin's 2014 biophilic framework](https://www.terrapinbrightgreen.com/reports/14-patterns/), the [AIA Framework](https://www.aia.org/design-excellence/aia-framework-design-excellence), [RIBA's Sustainable Outcomes Guide](https://www.riba.org/media/b2lgzeoo/riba-sustainable-outcomes-guide-2019-pdf.pdf), [RIBA Plan for Use](https://www.riba.org/work/insights-and-resources/plan-for-use-guide/), WBDG and the Passive House Institute. Retrieved DOE, EPA and Building Science Corporation resources support technical mechanisms. Institutional and architect project accounts support named precedents.

Full Ching and Brand books were not accessed or reproduced. WBDG article bodies were not extractable in this session; those links are supplementary, with detailed explanations also supported by other primary resources. RIBA 2019 numerical targets are not presented as current law. No certification thresholds or construction dimensions are prescribed.

Historical advice is evaluated against accessibility, climatic differences, overheating, privacy, maintenance and whole-life resource consequences. Risk/Peril and rigid historical social prescriptions were not selected as general recommendations. Biophilic patterns are presented without guaranteed health outcomes.

## Visual rights and accuracy

The [photograph provenance ledger](architecture-provenance.json) records each creator, original source, explicit license, original description, modifications, dimensions and checksum. Captions visibly credit photographers and buildings, with source and license links. WebP conversions preserve scene geometry and cap the longest edge at 1,440 pixels. The 47 photographs total about 8.9 MB; all 216 original/compact SVG files total about 0.75 MB. Loading uses existing lazy image handling and intrinsic dimensions.

Diagrams are original, editable and self-contained. They use the approved light editorial language: a white surface, Helvetica Neue regular, fine outlines, quiet gray context, restrained mint fields and a purposeful green accent. Their white background remains fixed in every browser appearance. They are conceptual relationships, not measured drawings of the photographed buildings, tested facade systems or project-specific construction details. Hypothetical design examples are explicitly identified.

Visual review covered all 108 originals in contact sheets and in the browser. Corrections included equal-area footprint geometry, the stop point of a shading ray, a structural-envelope junction, visible court door connections, record-label wrapping and dark-surface contrast. Automated checks found no clipped SVG labels. The current light editorial drawings keep their white surface in either browser appearance.

There are no missing required local assets. The direct Exeter window-carrel brief is fulfilled, and licensed construction-stage images now expose facade and insulation layers. [Optional enrichment briefs](architecture-asset-briefs.json) retain professionally reviewed project-specific junction details and licensed measured precedent drawings as possible later additions. Contextual comparisons remain clearly identified.

## Photographic example expansion

Every article was reviewed for a photograph showing its spatial, technical or process relationship. This pass adds 28 distinct licensed files and 42 placements, retaining the original 18 photographs and all approved drawings. Examples include Exeter’s window carrels, Katsura’s linked rooms, planted street drainage, a ventilated facade during installation, visible bolted connections, a worn walking route and full-size mock-ups. Paired wider views and close details are used where they teach different things.

The [coverage and verification report](architecture-evidence/photo-expansion/review.json) records each article’s one or two photographs. [Selected source metadata](architecture-evidence/photo-expansion/selected-assets.json) preserves the explicit Commons licensing evidence, and the [placement record](architecture-evidence/photo-expansion/article-placements.json) records the captions, alt text and example context added in this pass. Captions distinguish visible facts from performance claims. Six additional primary institutional references support the newly named precedents and design authorship.

## Editorial illustration style

The approved light editorial direction from the Filmmaking collection covers all 36 articles: 108 original drawings and 108 compact companions. All labels use Helvetica Neue regular with consistent visual weight. White backgrounds, neutral existing fabric, restrained mint fields and a purposeful green accent keep the drawings quiet. Broad highlighted surfaces use mint with green edges; routes and environmental paths use green. Short callouts work with the existing figure captions, without repeated illustration titles or verse labels.

Seventeen axonometric or exploded spatial views explain depth, sheltered edges, stairs, structural bays and separable components. Plans remain the primary view for routes and layouts; sections explain enclosure, sky exposure and environmental relationships. Process diagrams and comparison tables keep their original teaching role in the same visual language. Filled silhouettes replace line figures in occupied sections, and overhead symbols distinguish people in plans. The seated and standing outlook comparison uses separate matched sections so one person does not obscure the other's sight line. The spatial building-form comparison retains equal footprint areas; the rainscreen fragment leaves the drainage cavity open.

The original Site Repair, Courtyards Which Live and Window Place [pilot record](architecture-illustration-pilot.json) remains as historical review evidence. The [complete style record](architecture-illustration-style.json) records the rollout and its verification. Photographs, sources, article structure and substantive prose are retained. Drawings remain conceptual and make no measured-performance or construction-detail claims.

Shared styling and the original pilot compositions live in `scripts/architecture-editorial-visuals.mjs`; additional spatial compositions live in `scripts/architecture-spatial-visuals.mjs`. View-specific human symbols live in `scripts/architecture-figure-symbols.mjs`. Concise drawing labels live in `scripts/architecture-visual-labels.mjs`. The main generator rebuilds the complete collection. Its `--only=` option can limit regeneration to comma-separated pattern slugs.

## Readability revision

All 36 articles were audited for beginners, then three contrasting guides—Site Repair, Drained and Ventilated Rainscreen, and Test at Full Scale—were revised and checked before continuing. The pass revised 181 paragraphs, clarified technical terms at first use, replaced abstract framing with concrete relationships, corrected example-order references and supplied connecting prose for the Royal Crescent edge comparison. At completion of that pass, the articles ranged from 862–1,028 words of substantive prose.

All 60 photographic captions now lead with the visible relationship and retain the photographer and license text. The 108 diagram captions retain their teaching sentence and identify the drawing as an original schematic, while repeated measurement disclaimers were shortened. Relevant limits remain beside the decisions they affect, including fire safety, access, moisture behavior, technical testing and the limits of biophilic claims.

The [readability audit and review](architecture-readability-review.json) records recurring findings, the trial approach, per-article concerns and preservation checks. All article source sections, identities, links, recommendation queries and 262 local image files are unchanged. The diagnostic sentence and phrase counts support editorial review rather than supplying a readability score. Final checks passed: content acceptance, 39 compiler and 38 rendering tests, Svelte checking with zero errors or warnings, the production build, and ten desktop/phone browser tests. Representative browser and phone layouts were visually reviewed. Beginner comprehension has not been tested with external readers.

## First documented case-study pass

Three articles now include a documented built case with the design problem, a project-specific decision, the reported outcome and a transferable lesson. Cross Ventilation uses the Brock Environmental Center’s mixed natural/mechanical ventilation; Continuous Thermal Envelope follows Reform Cottage’s connected wall, roof and window work; Design for Disassembly follows the temporary Amsterdam courthouse through actual reassembly in Enschede. Existing scenarios, figures, credits and links remain.

The [case-study evidence review](architecture-evidence/case-studies/review.json) maps the claims to six primary accounts. It distinguishes Brock’s predicted ventilation opportunity from reported post-occupancy findings, Reform Cottage’s pressure-test result from heating consumption, and completed courthouse reuse from a design aspiration. The new WBDG project-team submission was retrievable in this pass, unlike the resource articles noted in the original research limitations. No numerical carbon saving is asserted for the courthouse.

A licensed contextual photograph of the Brock Center accompanies its case. The other two cases link to actual project and construction photographs in their primary documentation; existing component photographs retain their own headings. The field-guide introduction’s stale promise of optional practices has been removed. All 36 articles remain within 800–1,500 words; the three enriched articles contain 1,191–1,240 words. Architecture acceptance and all 38 article-rendering tests pass, along with six scoped desktop/phone checks. The published-only compiler test and production build are blocked by an unrelated reference from published `urge-surfing` to draft `tracking-the-unfolding-experience`. Those files were not changed. The development preview includes drafts and renders the three published Architecture articles correctly.

## Verification

The current light editorial rollout passed 39 compiler Architecture tests, 88 web Architecture/Filmmaking tests, Architecture acceptance and full-corpus validation (791 entities), scoped lint and the public production build. All 216 SVG variants match their built copies, and all 46 photograph files and their 60 placements remain intact. This illustration task leaves substantive prose unchanged; concurrent prose revisions are preserved. One Prospect alternative text was updated for its separate seated/standing sections. All diagrams were reviewed on 18 contact sheets; six desktop/phone article checks loaded their images without horizontal page overflow. The [style record](architecture-illustration-style.json) contains current counts, hashes and results. No guided practices were added.

The original collection acceptance, retained as historical evidence, recorded:

- Complete corpus validation: 787 entities, no unresolved references or collection cycles.
- Architecture-specific acceptance: 36 articles, all within the prose word range; 288 recommendation situations; complete metadata, related links, captioned images, asset dimensions and rights records.
- 39 compiler integration tests and 38 article-rendering/search/asset tests passed, including absence of Architecture guided practices.
- Compiler type check passed. Svelte check reported zero errors and zero warnings.
- Scoped ESLint passed.
- Production public build passed its built-in checks.
- Ten desktop/phone browser tests passed, covering verse discovery, all topic collections, every article and image, the shared headings and every contents link, body-language search, absence of practice links and removal of the former practice routes. No horizontal page overflow or failed architecture image responses.

The original [URL audit](architecture-evidence/link-audit.json) records 62 unique source and license URLs. A broken DOE page was replaced with its national-laboratory record. Four primary URLs restricted the final automated request, while their primary text was available through web research; this is recorded as an access limitation, not reported as an HTTP success. No remaining 404 was found. Links can change after this review.

## Resume and maintenance

The [progress manifest](architecture-progress.json) records each article's checksum, word count, figures, accepted batches and verification. Canonical prose lives only in `content/patterns/arch-*.md`; sidecars do not duplicate the articles. To revise, edit those Markdown files and the corresponding metadata or visual source, then run:

```sh
node scripts/build-architecture-visuals.mjs
node scripts/validate-architecture.mjs
pnpm validate:content
pnpm --filter @patternverse/compiler exec vitest run test/architecture-content.test.ts
pnpm --filter @patternverse/web exec vitest run src/lib/server/architecture-content.test.ts
pnpm --filter @patternverse/web check
pnpm --filter @patternverse/web build
pnpm --filter @patternverse/web exec playwright test --config playwright.architecture.config.ts
```

The generator only rewrites Architecture SVGs and upserts their dimensions. The validator updates the progress manifest and can use `--partial` while an authoring batch is in progress. Other sessions' existing changes were preserved. The original collection used `codex/architecture-verse`; this illustration rollout uses the dedicated `codex/architecture-light-illustrations` branch. No commit, push or deployment was requested or performed.
