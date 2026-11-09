# Songwriting course progress

## Beginner foundations — 2026-10-29

- Implemented the requested clearer foundation connecting intervals, scales, tonal home, chords, and chord families. Added **Build a Scale from Steps** as pattern 14; the course now has 49 patterns in eight parts. Part 3 has seven patterns, with its first five providing a beginner route. Existing entity IDs and legacy routes remain stable.
- Separated scale construction from hearing a tonal center. Simplified the first chord explanation around alternate scale notes, major/minor quality, and the distinction between a chord root and a song tonic. Connected pitch names, scale degrees, chord numerals, and beat counts explicitly. Moved diminished/augmented triad and altered-minor detail into the later harmonic-color material.
- Added six original short comparisons through the existing player: interval-preserving versus changed motifs; C/D major scales; C major/natural minor; C-centered and A-centered sketches; and arpeggiated/block C-major versus C-minor triads. Added the scale-step SVG with accessible text and light/dark treatment, an authored pattern-card graphic, and a source-linked educational listening study. These are playback comparisons, not new construction widgets or practice forms.
- Updated chapter order, all displayed counts/numbers, part contents, course entry points, glossary/reference links, listening index, source register, related-pattern metadata, and foundation outcomes. Earlier dated audits and source-review article numbers retain their original 48-pattern snapshot; the current listening manifest explains that distinction.
- Validation: 86 course/music unit and content checks passed in five files, including all 49 article renders, source-linked studies, reference navigation, musical relationships/durations, and all 64 draft entities remaining excluded from the public corpus. Desktop/phone course and listening review covered every article and all 17 diagrams in light/dark; after correcting one readiness wait and two stale responsive-layout assertions, all affected cases passed. The final focused rerun passed 10/10 cases, including real audio, example switching, the foundation route, legacy redirects, and the library. Across the two browser runs all 35 applicable course/listening cases passed, with one intentional phone-only duplicate-diagram skip; four additional existing player cases passed. Inspected desktop/phone foundation captures and the scale diagram. Scoped ESLint and Prettier passed.
- Unrelated workspace checks remain: the full graphic-registry coverage test reports a missing graphic for **access-over-ownership**, which was already absent from the starting registry; the full web type/Svelte check reports the existing unsupported `exact` option in `VerseSelector.component.test.ts:79`. There are no diagnostics in the changed files. These unrelated sources were not changed.
- Work remains local and uncommitted on dedicated GitButler branch `codex/songwriting-foundations`. No other session's work was committed or moved. Local draft preview: `http://localhost:5181/collection/songwriting-part-3`. No publication, push, or pull request.

## Listening examples in every article — 2026-10-26

- User authorized the written integration of the selected examples into their respective articles. Scope is one developed anchor per pattern, as recommended by the audit; the other 96 proposals remain optional alternatives.
- Batch 1 (patterns 1–12): 11 missing sections added. Existing Four Tet section retained. Each new section connects a specific listening/process/score question to the original course examples. Sources are linked in the text; no new player or timestamp is implied.
- Batch 2 (patterns 13–24): 11 missing sections added; sources linked and original teaching examples distinguished from the named repertoire.
- Batch 3 (patterns 25–36): 12 missing sections added; sources linked and original teaching examples distinguished from the named repertoire.
- Batch 4 (patterns 37–48): 10 missing sections added; sources linked and original teaching examples distinguished from the named repertoire.
- Final review: all 48 articles contain a developed named study; the guide now indexes all 48 rather than the older seven-study mix. Added a named Beethoven performance, distinguished the original Tom’s Diner recording and full Dance Yrself Clean version, checked short classical score passages and first-person process accounts, and narrowed old originality statements to the course material.
- Validation: 66 focused content/music checks pass, including all 63 draft entities staying out of the public corpus. All 30 desktop/phone browser cases pass: all 48 pages visited in each layout, source links/headings/draft markers/overflow checked, guide routes and existing controlled player lifecycle checked. Inspected representative captures and the actual app. Focused lint/format checks pass. The new browser test’s JSON import initially prevented collection; corrected file loading and the completed run passed. No full production build rerun for this manuscript pass.
- Completed record: `listening-integration.md` and `listening-integration.json`. The earlier audit counts are marked historical. Three YouTube bindings remain; the other 96 candidates, new embeds, precise excerpt endpoints, and inline pilot placement remain outside this written pass. Everything remains unpublished and uncommitted; no push or pull request.
- Durable coverage and source record: `listening-integration.json`. Later batches and final validation follow below. All entities remain drafts; no commit, push, or pull request.

Updated: 2026-10-26. Current local branch: `codex/songwriting-player`; original authoring branch: `codex/songwriting-course`.

## Article-example audit — 2026-10-26

- Completed a 48-row audit of writing moves, original worked examples/tables, candidate purposes, source types and actual player bindings. `example-audit.md` is the readable report; `example-audit.json` preserves per-article recommendations and remaining checks. The audit distinguishes source identity, editorial suitability, detailed musical analysis and working playback.
- Found that the expanded listening edition is not complete. Before this pass, only article 43 named a specific external listening example in its body, while the three pilot players had no matching prose. After targeted corrections, four article bodies explain a named study, three have listening players, 44 still need written external-study integration and 45 lack a listening player. The 144-candidate file remains proposal data, not a completed set of recording analyses.
- Added contextual listening sections and exact source links for Four Tet in article 3, Bill Withers in article 13 and the Radiohead live/studio pair in article 47. Distinguished changes around a motif from changes to the motif, contour from interval transcription, and multiple-variable realizations from a controlled one-change revision. The original worked examples remain the precise teaching demonstrations.
- Replaced the extra Radiohead reference in article 43 with the planned Joni Mitchell 1969/2000 comparison, checking the artist's primary album archive. Explicitly stated that no matched player pair has been added there. Clarified article 22's separate call-and-response sketch so readers cannot mistake it for the canonical verse.
- Updated changed chapter length/source metadata and the source register, including stale Radiohead/Beatles used-by associations. Added a contract check that every mounted study, artist and recording ID is actually explained in its article, and an app check for all four changed listening discussions.
- Remaining work is recorded rather than disguised as complete: inline player placement, 44 unwritten study integrations, exact passage verification, the older listening guide's artist balance, and checked reductions/form maps for the more technical candidates. In particular, a cover pair cannot isolate transposition, chord labels cannot prove actual voice leading, and a quiet break is not automatically a bridge.
- Verification: 64 focused course/music checks passed in three files, including all 48 article-rendering checks and unpublished/public corpus boundaries. Desktop/phone review passed for all four listening discussions (two browser cases); the rendered prose and source destinations were inspected. A phone run interrupted by a content-triggered preview reload passed once the preview settled. Focused lint, formatting, and the 48-row audit-data consistency check passed. No publication, push, pull request or unrelated source changes.

## YouTube passage player — 2026-10-26

- Replaced the multi-service pilot after the user chose YouTube for focused listening. Removed the provider switch, remembered-service controls, unused preference module/icons, and Bandcamp/Spotify frame permissions. Earlier source research remains in the editorial manifest.
- Added recording-specific, labeled time windows with listening cues, play/replay, a whole-recording option, and timestamped external YouTube links. The initial windows are broad comparisons, not verified phrase/section boundaries. Radiohead’s live/studio choice remains intact.
- Reused the existing host video SDK, readiness/error mapping and excerpt lifecycle through a small course adapter. Native player controls remain visible. Playback pauses at the selected endpoint and resets for replay; changing window/version, hiding/leaving an article, and loading another card stop the previous player.
- Validation: 85 focused unit/content/video-runtime checks and all 10 desktop/phone pilot browser checks pass. Browser tests use controlled SDK/frames to exercise actual range enforcement, replay, full-recording selection, errors/retry, old preference independence, delayed readiness, cleanup, direct links, and no requests before explicit loading. Type/Svelte checks pass with zero errors/warnings; focused lint/formatting and the public production build pass.
- Found that YouTube rejected all four embeds at the numeric preview address; all four recording frames load on `localhost`, and studio Radiohead starts from the replay button. The preview now advertises `http://localhost:5181`, and browser tests use it. No shared video-runtime change was needed.
- Actual provider/browser availability and source checks are recorded separately in `listening-pilot-review.md`. The screenshot is `youtube-listening-preview.png`. No course entities were published; no push or pull request.

## Three-example listening pilot — 2026-10-26

- Implemented the icon service switch in the actual app with Radiohead’s **True Love Waits** (2001 live / 2016 studio), Four Tet’s **Two Thousand and Seventeen**, and Bill Withers’ **Lean on Me**. All three appear in the listening guide; each also appears in its relevant pattern.
- Added device-local remembering, exact recording/version links, temporary missing-source fallback, explicit provider loading, accessible keyboard switching, and direct links. Selecting a new player/version/service or leaving/hiding the article stops the previous player. The original synthesized player shares that playback coordination.
- Checked source IDs against artist and album metadata. Spotify’s real Radiohead preview starts; Bandcamp frames load the correct Radiohead/Four Tet recordings. All four YouTube Music links reach the intended recordings. The studio Radiohead YouTube embed reports unavailable here; the direct Music link works. Provider previews, ads, regional availability, and subscriber playback remain provider-controlled.
- Verification: 76 focused unit/content tests and all 10 pilot desktop/phone integration tests pass; type/Svelte checks report zero errors/warnings; focused lint/formatting and public production build pass. The full course browser run has 42 passes, four intentional skips, and two existing navigation-label assertion failures. The full web unit run has 1,958 passes and two unrelated graphic/message failures. See `listening-pilot-review.md` for exact checks and limitations.
- Inspected actual desktop and phone presentation. Provider frames are never requested before the reader loads one. Added the two exact embed hosts to the existing frame policy and covered that permission in browser tests. Source data lives in `listening-pilot.json`; `listening-pilot-preview.png` records the card presentation.
- The wider 144-reference proposal remains unintegrated. All course entities remain drafts; no publication, push, or pull request. Work remains local and uncommitted.

## Icon service switch refinement — 2026-10-26

- Updated the inline listening-card design at the user’s request: one connected three-way switch using the YouTube Music, Spotify, and Bandcamp icons replaces the previous text-button and dropdown alternatives. The selected segment is highlighted, and its full service name stays visible beside the control. Every icon has an accessible label and a tooltip.
- Preserved the remembered preference, exact live/studio choice, explicit provider loading, preview labeling, and one-recording fallback behavior. Added Left/Right/Home/End navigation without overriding browser focus styling; each segment is 44 pixels wide with 44-pixel targets on coarse pointers.
- Verified all three version-pinned service-logo SVG URLs (HTTP 200 and valid SVG). DOM interaction checks passed for the single switch, labels, selected states, keyboard movement/focus, remembering, version changes, and temporary fallback. The fragment passed structural rendering checks. This remains a design preview with no connected music playback or app integration; course publication status is unchanged.

## Reader-selected listening service design — 2026-10-26

- Refined the design around different reader subscriptions: the reader's remembered service overrides the editorial Bandcamp/Spotify/YouTube default. A one-recording fallback does not overwrite that preference. The user's YouTube Music preference is the preview's starting state.
- Created an inline interactive comparison of two compact listening-card layouts, “Service tabs” and “Compact selector,” in this chat's visualization folder (`flexible-listening-card.html`). Both use “True Love Waits” with separate live/studio choices, a listening question, explicit remembering, source-specific actions, and a simulated unavailable-service state. The preview states clearly that music playback is not connected.
- Updated `player-design.md` with the proposed preference, exact-recording matching, metadata, fallback, and provider behavior. YouTube Music opens the service; an explicit “Watch here instead” action would load a visible ordinary YouTube embed. No hidden audio, account/subscription inference, automatic playback, or universal ad-free promise.
- DOM-based interaction checks passed for both layouts, synchronized preference, version changes, provider-area reveal, temporary fallback without losing preference, remembering on/off, saved-state payloads, and design controls, with no runtime errors or external playback requests. The visualization fragment passed the renderer's structural checks. A browser preview could not open the local file under the browser URL policy; no alternate browser workaround was used. Presentation and real provider playback remain app-implementation checks. The actual app is unchanged, and the course remains local and unpublished.

## External listening provider design — 2026-10-26

- Recorded the user's revised direction in `player-design.md`: Bandcamp when the exact recording is available, with Spotify and official YouTube alternatives. Recommended Spotify before YouTube; that ordering remains a design recommendation. YouTube Music can be a service link, while in-page YouTube playback uses the standard visible embed.
- Checked current primary provider documentation. Bandcamp has artist-controlled streaming limits/purchase prompts; Spotify embeds can be preview-only; YouTube embeds may show ads even in privacy-enhanced mode. The design does not promise universal ad-free full-track playback. Original teaching demonstrations retain the existing ad-free piano-roll player.
- Specified recording/version identity, a listening question, reader-initiated loading, an ordinary source link, and explicit provider limitations. No automatic provider switching or assumptions about inaccessible iframe playback state. This is the agreed provider direction with a recommended default order; external listening cards are not implemented yet. The course remains local and unpublished.

## Listening selection refinement — 2026-10-26

- Revised the proposal following the user’s taste preferences: removed “Creep” and Taylor Swift; kept “True Love Waits” and its live/studio comparison. Reduced main-matrix Beatles placements from 20 to four and Radiohead placements from six to three, retaining distinct teaching uses rather than removing either artist entirely.
- Replaced 20 placements with examples including Leonard Cohen/Jeff Buckley, New Order, Vashti Bunyan, Bill Withers, Bob Marley and the Wailers, Sam Cooke, the White Stripes, Amy Winehouse, Suzanne Vega, David Bowie, Louis Armstrong, Ray Charles, Kate Bush, Sufjan Stevens, Fleetwood Mac, Robyn, Mitski, Queen, and Brian Eno. New candidates have source links and a listening angle tied to the existing article’s purpose. Musical analyses remain proposals pending the same excerpt/transcription checks described in the original research pass.
- Added a durable selection brief and structured preferences to the proposal, updated the songbook reuse pointer, and revised the blueprint’s listening methodology so future integration follows the broader selection and explicit exclusions. The three Radiohead placements are “Everything in Its Right Place,” “15 Step,” and “True Love Waits.” The four Beatles placements are “Let It Be,” “Blackbird,” “Tomorrow Never Knows,” and “Strawberry Fields Forever.”
- Validation: exactly 48 manifest-matched articles and three linked candidates per article remain (144 placements); Markdown/JSON parity, exclusions, retained work, artist counts, five guide plans, and formatting passed. The current main matrix has 121 distinct source URLs. This changes the editorial proposal and selection standard; integration into the course’s existing listening studies remains a later step. All work remains local and unpublished; no push or pull request.

## Listening-reference expansion proposal — 2026-10-26

- Reviewed the current sequence and purpose of all 48 pattern articles and prepared `listening-candidates.md`: exactly three candidates per article (144 placements), with a specific listening angle and source links. Added a reuse plan with three pointers for each of the five reference guides.
- Broadened the candidate pool across classical repertoire, classic popular songs, folk, country, jazz, soul, Afrobeat, hip-hop, trip-hop, electronic pop, house, jungle, ambient, and contemporary electronic music. Examples include Bach, Schubert, Joplin, Ellington, Dolly Parton, Tracy Chapman, J Dilla, Arooj Aftab, Four Tet, Bicep, Nia Archives, SOPHIE, Fred again.., and Floating Points/Pharoah Sanders/LSO.
- Source research distinguishes artist/label releases and licensed recordings from score editions, catalogs, performing-institution notes, and first-person process interviews. The proposal explicitly separates checked source identities from suggested musical interpretations; it does not claim a complete audio audition or pitch-level analysis of all candidates. Specific remaining checks include exact harmony/voicings, excerpt selection, edition-dependent bar numbers, and the keys/ranges of the Robyn/Calum Scott comparison.
- Saved `listening-candidates.json` with stable chapter IDs, the same 144 proposals and their links, and explicit candidate/unverified-analysis status for future selection. The Markdown is the human-readable editorial proposal. It explains repeated appearances and recommends one anchor plus two optional comparisons rather than three full analyses in every pattern.
- Validation: all 48 numbers, titles, IDs, part assignments, three-candidate counts, and source-link presence were checked against `chapters.json`. There are 114 distinct source URLs in the main candidate matrix. Formatting and Markdown/JSON parity were checked. The proposal is local and unpublished; the existing articles and player examples are unchanged. No push or pull request.

## Basic instrumentation — 2026-10-26

- Added Piano, Guitar, and Bass guitar as independent choices for each audible part in both the course examples and chord-sketch player. Defaults are piano melody, guitar chords, and bass guitar for the bass line. Choices survive clip changes and chord edits while the player stays mounted; they are not saved across reloads.
- Added original synthesized timbres with distinct spectra, attacks, amplitude decays, and brightness decays. The UI identifies them as synthesized instruments. There are no external sample assets or new dependencies. These are basic sound approximations rather than sampled acoustic instruments or guitar strumming/fretboard arrangements.
- Switching instruments while playing preserves the musical beat, score, and pitches, silences the previous voices, and resumes held notes for their remaining durations. Waveforms are reused within each audio context; filters are disconnected on pause, mute, edit, and disposal. Position, tempo, and volume sliders remain removed.
- Verification: 20 music/theory unit tests passed. Desktop/phone checks passed (19 cases, three intentional platform-specific skips), including independent instrument choices, retention between clips and chord edits, changing instruments during playback, real audible output, three distinct rendered waveforms, clean note endings, and existing editor controls. Type/Svelte checks passed with zero errors/warnings; focused lint and the public production build passed.
- Inspected the piano-roll and per-part instrument selectors in the app; `player-instruments-preview.png` records the result. The course remains unpublished; no push or pull request.

## Simplified player controls — 2026-10-26

- Removed the position slider, tempo control, and volume control from the shared player, including the chord-sketch player. Playback uses the current example's original tempo and the existing default sound level. Retained Play/Pause, Restart, Loop, the bar/beat readout, bar paging, and part switches.
- Removed unused slider state and styles, and updated the course introduction, Music description, and player design notes. The chord editor's touch Position selector still reorders chords; it is separate from playback seeking.
- Type/Svelte checks passed with zero errors/warnings, and focused lint and formatting passed. All six desktop/phone player cases and ten editor cases passed, with two intentional platform-specific editor skips. The real-audio check now waits for a nonzero analyser reading instead of relying on a single initialization sample; actual playback remains verified.
- Inspected the simplified player in the app and saved `player-simple-controls-preview.png`. The course remains unpublished; no push or pull request.

## Pattern collection restructuring — 2026-10-26

User requested that the whole course become genuine patterns, retain a logical route, and stop requiring a from-scratch theory curriculum.

- Reframed the 25 former concept articles around recurring writing decisions, with new action-oriented titles, a recognizable use situation, an explicit move, a concrete original comparison, and a boundary before the supporting technical explanation. Retained the substantial musical work and diagrams. The 23 existing practical patterns now have the same clear entry contract.
- All 48 main articles are `pattern` entities. Examples: **Think in Chord Numbers**, **Transpose the Song to Fit the Voice**, **Make Space Part of the Rhythm**, **Make Speech and Melody Agree**, and **Choose a Form That Serves the Song**. Stable IDs preserve the worked-song references and player/editor bindings.
- Kept eight ordered six-pattern parts. The overview now offers problem-based entry routes alongside the full sequence. Earlier material is an optional refresher (`helpful_before`) rather than a required prerequisite. Every pattern has two explained related-pattern links, distinguishing how to combine it with neighboring approaches.
- Converted the notation guide, songbook, glossary, listening guide, and troubleshooting index into reference collections with meaningful related-pattern selections. They remain useful support material rather than being mislabeled as reusable writing patterns. No songwriting Concept entities remain.
- Updated article navigation, collection summaries, the glossary's labels, and the editorial blueprint and manifest. All 48 patterns have explicit situation/response/boundary metadata and eight discovery queries in the editorial sidecar. Added 25 authored card marks and kept existing registry entries intact, bringing the course total to 48.
- Former `/concept/songwriting-*` review URLs redirect to the appropriate pattern or reference collection only when its entity is present in the corpus. Redirects retain explicit collection context. The default article browser prefers the guided course part over reference indexes; an explicitly selected reference collection still takes precedence.
- Reviewed the decision boundaries between identity/hook, pace/activity, note distances/contour, chord quality/voicing, transposition/modulation, section contribution/whole-song form, and local arrival/overall pacing. Original Porch Light and Platform Three notes, durations, forms, lyrics, and canonical source data stay intact.
- Verification: full content validation passed (481 current development entities); 75 focused course, music, and graphic tests passed; desktop/phone browser checks passed (31 cases, three intentional platform-specific skips); type/Svelte checks passed with zero errors/warnings; focused lint and the public production build passed. Browser cases cover default and explicit collection context, legacy links, Music library entries, responsive articles and references, illustrations, actual audio, persistent chord edits, dragging, and touch controls.
- Inspected the pattern heading, use situation, course navigation, and problem-led overview in the app. Fixed table links caught in visual review and added a check for all sixteen entry links. `pattern-structure-preview.png` records the new pattern presentation, and `pattern-routes-preview.png` records the problem-based entry table. A final rerun of course navigation and presentation passed on desktop and phone (15 cases, one intentionally skipped duplicate diagram check). No publication, push, or pull request.

## Card controls refinement — 2026-10-26

- Replaced the Move earlier / Move later / Duplicate / Remove strip with direct desktop dragging and contextual copy/trash icons on each chord card. An insertion marker shows the drop position; reordering preserves the intervening chord order and makes one undoable edit.
- Icons appear on hover or keyboard focus and operate on their own card. Duplicate selects its new copy. Remove preserves a neighboring/current selection, and the final chord cannot be removed.
- Added Left/Right keyboard reordering, retained focus after moving/duplicating/removing, and announced changes for screen readers. Touch-capable layouts show the selected card's icons with 44-pixel targets and a Position selector for reordering.
- Desktop/phone editor checks passed: 10 cases with two intentional platform-specific skips. These include actual native dragging across rows, hover/focus behavior, targeted duplicate/remove, last-chord protection, touch and keyboard reordering, undo/redo, save/restore, and existing playback checks. Type/Svelte checks passed without errors or warnings; the public production build passed. Design details are recorded in `player-design.md`.
- Final desktop drag check also passed for insertion both before and after a target card. Inspected the completed controls in the app; `chord-card-controls-preview.png` retains the contextual icon view. Focused lint and formatting passed.

The course remains a local unpublished draft. No push or pull request.

## Roman-numeral editor follow-up — 2026-10-26

The user requested Hooktheory-like relative chord notation and chose chord progressions first. Continued on the local player branch, `codex/songwriting-player`.

- Added a Roman-numeral chord editor to the overview, songbook, and chapter 16. Numerals are prominent, chord names appear beneath, and a selected chord shows its actual notes. Readers can add, replace, move, duplicate, remove, change durations, undo, and redo.
- Added transposition across 12 tonic pitch classes in major and natural minor, with correct scale-letter spelling. Explicitly labeled the chosen minor convention and the minor v chord. Presets include the existing Porch Light verse and chorus progressions.
- Saved one bounded, versioned sketch on the current device after edits, with restoration and a usable fallback when storage fails. The canonical course examples stay unchanged.
- Extended the shared piano roll with Roman-numeral/chord-name blocks at actual chord onsets and durations, including partial bars. The original verse, chorus, and bridge examples now have these labels too. Editing or collapsing the editor stops its audio.
- Updated chapter 16 to explain the editor, diminished symbol, and minor convention. Documented the design in `player-design.md`.
- Inspected the editor in the in-app browser; `chord-editor-preview.png` retains the Roman-numeral palette, progression, and selected-chord controls.
- Verification: 69 focused theory, playback, and course-content tests passed. Existing course/player browser cases passed (17), and all six new desktop/phone editor cases passed on their final run. Verified actual transposed oscillator frequencies, save/restore, undo/redo, minor palettes, partial final bars, untouched original examples, storage failure, and cleanup on collapse. Type/Svelte checks passed with zero errors/warnings; focused lint and the public production build passed.

All course entities remain drafts. Nothing was pushed, deployed, published, or submitted as a pull request.

## Musical player follow-up — 2026-10-26

User authorized playback and selected a piano-roll view. Local player branch: `codex/songwriting-player`. See `player-design.md` for the design and scope.

- Built a reusable player for five original clips: Porch Light's seed, verse, chorus, bridge, and Platform Three's bass groove. Playback reads the existing canonical `examples.json`; chord voicings are labeled as a simple sustained-triad listening arrangement.
- Added play/pause, restart, tempo, volume, whole-clip loop, seek, and independent part switches. The piano roll highlights sounding notes and shows bar/chord labels, with automatic four-bar paging for longer clips.
- Integrated it into the course overview, songbook, and eight relevant chapters. The written articles and all draft boundaries remain available. Audio starts only after Play; navigating away or hiding the tab stops it. No MIDI hardware, external audio downloads, practice forms, or sung recordings are involved.
- Updated the isolated preview for the current application's shared article-contribution support files and content-asset manifest, and disabled automatic service-worker registration within that temporary preview only.
- Verification: 60 focused unit/content tests passed, including nine new timing/cleanup/score tests. Desktop and phone browser review passed 17 tests with one intentional skip, including measured nonzero audio output, highlighted notes, pause/tempo controls, part muting, bar navigation, example changes, and audio disposal on navigation. Type/Svelte checks passed with zero errors/warnings; focused lint and the production public web build passed.
- Inspected the player in the in-app browser; `player-preview.png` retains the playback view. A final six-test player browser pass verified the last phone layout adjustment: one-bar examples fit fully without sideways scrolling. Remaining sound-design choices can be reviewed with the user: the first version uses soft synthesized tones. Staff notation, editable notes, MIDI import/export, phrase-specific loops, and full-song arrangement playback are possible follow-ups, not implemented features.

Nothing has been pushed, deployed, published, or submitted as a pull request. Changes remain local and uncommitted.

## Complete draft edition

- Authored the editorial blueprint and ordered 48-chapter plan before drafting.
- Established chapters 17 (circle of fifths), 27 (imagery), and 41 (song form) as representative chapters, then completed all eight six-chapter batches.
- Added 48 full chapters: approximately 39,300 words including their navigation. The complete course and supporting references contain approximately 49,500 words.
- Added the Music verse, course overview, eight ordered part collections, explicit previous/next chapter navigation, and three suggested reading routes.
- Completed the original Porch Light lyric, counted verse/chorus/bridge melodies, chord and form charts, early miniature, transposition, and labeled harmonic alternatives. Completed the contrasting Platform Three instrumental design.
- Added the notation-optional reading guide, 82-term linked glossary, seven listening studies, primary-source register with 43 exact destinations, and 14 troubleshooting routes.
- Created 16 accessible explanatory SVG diagrams with light/dark treatment and 23 explicitly authored pattern-card graphics. Appended only songwriting records to the existing shared illustration registry.
- Recorded prerequisites, actual chapter lengths, source links, visual decisions, and eight natural-language discovery queries per pattern. These richer fields stay in the editorial sidecar; no new live search behavior is claimed.
- Reviewed continuity of example pitches, durations, chord schedules, lyric perspective, section lengths, and scope. Distinguished a changed voicing from a changed progression, transposition from modulation, a chord symbol from a prepared suspension, and relative from parallel minor.
- Visually reviewed all diagram sheets in light and dark plus the actual desktop and phone article pages. Corrected crowded motif labels, enlarged the circle's enharmonic minor label, and preserved conventional keyboard key colors in dark mode.

## Verification results

| Check                                                           | Result                                                                                                                                                                                                                                    |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete content validation                                     | Passed: 303 development entities, including all 63 draft course entities.                                                                                                                                                                 |
| Focused course, rendering, draft-boundary, and artwork tests    | Passed: 71 tests across three files.                                                                                                                                                                                                      |
| Desktop/phone browser review                                    | Passed: 11 tests; one duplicate phone-only illustration-sheet test intentionally skipped. Includes navigation, representative articles, songbook/glossary links, all 16 diagrams in both themes, contained labels, and no label overlaps. |
| Public corpus compilation                                       | Passed: 240 entities; no songwriting entity or Music verse included.                                                                                                                                                                      |
| Production web build                                            | Passed, including the repository's public-build checks. No course HTML pages generated. Static illustration assets follow the existing asset convention.                                                                                  |
| Type/Svelte checks                                              | Passed: zero errors and zero warnings.                                                                                                                                                                                                    |
| Repository lint                                                 | Passed.                                                                                                                                                                                                                                   |
| Formatting of all course content and new TS/JSON/Markdown files | Passed; content was checked explicitly because the repository globally ignores it for formatting.                                                                                                                                         |
| Repository-wide formatting                                      | Reports eight unrelated existing files; left unchanged.                                                                                                                                                                                   |
| Full web unit suite                                             | 1,627 passed, nine failed in three unrelated areas: collection label whitespace, retired therapy content, and the existing executable worksheet runner. Course tests pass.                                                                |
| Workspace-wide tests                                            | Other package tests passed before the existing MCP widget build failed to resolve `$app/paths` from `ArticleWidget.svelte`. This session does not change that widget or its build.                                                        |

The initial browser review passed after a repository test build finished rewriting shared generated routes. A subsequent review request exposed the same collision again, alongside unresolved references in another ongoing content batch. The course now has an isolated local preview: it copies the current application, all 63 course entities, and static assets into a temporary directory, uses the installed dependencies, and keeps its generated routes separate. The editable repository and public build behavior are unchanged. Other library content is intentionally absent from this course-only review snapshot.

## Local review

Open `http://localhost:5181/collection/songwriting-course` while the development server is running. If needed, start it from the repository root with:

```sh
node docs/songwriting-course/preview.mjs
```

Restart this preview after editing course content or application source to refresh its snapshot. It binds only to localhost and refuses to replace a server already using port 5181. Stopping it removes its own temporary copy. The dedicated browser configuration uses this same isolated preview when no server is already running.

Recovery verification: the course rendered in the in-app browser, and the desktop/phone suite passed again with 11 tests and one intentional skip. The shared corpus currently has unresolved references in another ongoing content batch; those files were left untouched.

Run the dedicated unpublished-course browser checks with:

```sh
SONGWRITING_DRAFT_REVIEW=1 pnpm --filter @patternverse/web exec playwright test --config playwright.songwriting.config.ts
```

Run the focused content review with:

```sh
pnpm --filter @patternverse/web exec vitest run src/lib/server/songwriting-content.test.ts src/lib/illustrations/pattern-graphics.test.ts src/lib/server/commons.test.ts
```

Rebuild the authored static illustrations with:

```sh
python docs/songwriting-course/render-diagrams.py
```

A retained desktop article screenshot is `review-preview.png`. Browser review captures are also available in the ignored `apps/web/test-results/` directory after running the dedicated checks.

## Publication and workspace boundary

All 63 course entities remain `status: draft`. This is a complete course for editorial review, now with the authorized musical example player, and with no interactive practices or generated commercial-song audio. Nothing was pushed, deployed, published, or submitted as a pull request. Changes remain local and uncommitted.

The workspace already contained substantial unrelated work. The initial edition's sole shared runtime-data change was the additive set of 23 songwriting illustration records. The player follow-up adds its component and a guarded insertion in the entity reading page, preserving existing application changes. Unrelated test, formatting, and build failures above were recorded rather than repaired across another session's work.
