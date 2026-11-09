# YouTube listening pilot review

Updated locally on 2026-10-26 after the user chose YouTube in place of the multi-service switch. All course entities remain drafts. Nothing was published, pushed, or submitted as a pull request.

## Current behavior

The three study cards use a single, visible YouTube player with recording-specific passage choices, play/replay, a whole-recording option, and a direct YouTube link. Radiohead's 2001 live / 2016 studio comparison remains separate from passage selection. Each card appears in the listening guide and its relevant pattern: Revise the Weakest Moment; Repeat with a Reason; Preserve the Distances in a Melody.

The provider switch, remembered-service checkbox, unused preference module, service-icon assets, and Bandcamp/Spotify frame permissions have been removed. Old service preferences are ignored without deleting stored data. Bandcamp and Spotify IDs remain in the editorial manifest as source research, not active player choices.

No provider frame or SDK loads before an explicit request; loading does not autoplay. The reader can press play in YouTube or use the replay button. The existing host video runtime enforces the selected endpoint, pauses and resets for replay. Choosing another window remounts the requested range without autoplay. Changing recording, closing a player, loading another card, hiding the page, and navigating away dispose the old player and its timers. The synthesized teaching player shares playback ownership.

YouTube errors are visible with Retry and a direct recording link. External YouTube links include the selected starting time but do not enforce its ending time. Ads, region/account restrictions, embedding permissions and seek precision remain controlled by YouTube. No recordings or artwork are hosted by the course.

## Passage windows

| Recording                        | Windows                    | Purpose                                                                                                                                                |
| -------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| True Love Waits, studio and live | Each recording's 0:00–0:45 | Compare the opening accompaniment and space around the vocal entrance. These are separate realizations, not a synchronized phrase-by-phrase alignment. |
| Two Thousand and Seventeen       | 0:00–0:30 and 1:30–2:00    | Establish a reference texture, then compare a later window for persistence and change.                                                                 |
| Lean on Me                       | 0:00–0:45                  | Listen through the opening and vocal entrance; choose a short gesture to describe contour before checking intervals.                                   |

These are broad, explicitly timed listening windows. They are not certified phrase endings, formal-section boundaries, or pitch-level transcriptions. Refine their boundaries through listening review before expanding the course. The card retains each study's original comparison connected to Porch Light or Platform Three.

## Source identity checks

Public artist/album metadata and recording identifiers were checked on 2026-10-26. The YouTube sources are official artist-channel recordings. Earlier Spotify IDs were matched to the named album rather than same-title compilation tracks; Bandcamp IDs came from artist-page metadata. Those earlier identifiers are retained for editorial reference only.

| Recording                                              | Artist / label page                                                           | Spotify album track                                              | Official YouTube audio                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| True Love Waits, studio, A Moon Shaped Pool (2016)     | [Bandcamp](https://radiohead.bandcamp.com/track/true-love-waits)              | [Spotify](https://open.spotify.com/track/01ZpFhrMMqKPVCwyqXneVp) | [YouTube](https://www.youtube.com/watch?v=WSnc_6Z7HqQ)                |
| True Love Waits, Live in Oslo, I Might Be Wrong (2001) | [Bandcamp](https://radiohead.bandcamp.com/track/true-love-waits-live-in-oslo) | [Spotify](https://open.spotify.com/track/6PbeGqzGdjookqESRgm1AS) | [YouTube](https://www.youtube.com/watch?v=mbVKGlh3gg4)                |
| Two Thousand and Seventeen, New Energy (2017)          | [Bandcamp](https://fourtet.bandcamp.com/track/two-thousand-and-seventeen-2)   | [Spotify](https://open.spotify.com/track/55xZJMcE4mdrhMisHTeORA) | [YouTube](https://www.youtube.com/watch?v=ZNuaLyPMc48)                |
| Lean on Me, Still Bill (1972)                          | No Bandcamp source curated                                                    | [Spotify](https://open.spotify.com/track/3M8FzayQWtkvOhqMn2V4T2) | [YouTube official audio](https://www.youtube.com/watch?v=gOZgo8gMIoM) |

The suffixed Four Tet Bandcamp URL is intentional: the unsuffixed URL returned 404 during the earlier source check. No Bandcamp match for Withers is asserted. The canonical YouTube IDs, passage ranges, questions and chapter bindings live together in `listening-pilot.json`.

## Validation

- 85 focused unit/content/video-runtime checks passed across listening data, timestamps, playback ownership, original music transport, course contracts, shared video bounds, provider lifecycle and SDK loading.
- All 10 pilot browser checks passed on desktop and Pixel 7, including a final run on `http://localhost:5181`. Controlled SDK/frames verify range enforcement, pausing/reset at the endpoint, replay, whole-recording selection, provider errors/retry, delayed readiness after disposal, single-player ownership, pagehide/navigation cleanup, stale service-preference independence, direct source links without JavaScript, and zero external requests before loading. These controlled tests do not certify real-provider playback or account access.
- Type/Svelte checks passed with zero errors/warnings. Focused lint and formatting passed. The public production build and its publication checks passed; no course entity was published.
- Desktop and phone card presentation were inspected. `youtube-listening-preview.png` retains the current desktop card; the browser test artifacts are in the ignored `apps/web/test-results/` directory.

## Local browser behavior

The numeric preview address `http://127.0.0.1:5181` returned “This video is unavailable” for all four curated recordings, using either privacy-enhanced or standard YouTube embeds. At `http://localhost:5181`, the Radiohead studio recording loaded correctly and pressing the replay button changed its native control to Pause. The Four Tet, Bill Withers and live Radiohead frames also loaded correctly on localhost, showing their intended recording titles. The preview now advertises the localhost address and the dedicated browser configuration uses it. The shared application/provider runtime did not need an origin workaround or a different recording. Real-provider checks confirm loading of all four recordings and a playback start for studio Radiohead; automated endpoint/replay checks use a controlled SDK, rather than claiming a complete real-audio audition.

Use `http://localhost:5181/collection/songwriting-listening-guide` for review. The server still binds only to the local machine. Existing local sketches/preferences are scoped to their original browser origin; this change does not migrate or erase data stored under the numeric address. The original privacy-enhanced YouTube host remains in use. A temporary standard-host experiment was confined to the disposable preview snapshot and restored.

Full-duration playback, every account/region combination, and seamless looping are not certified. The card keeps a timestamped external link and states the provider limits.

## Previous wider regression results

The earlier full course browser run had 42 passes, four intentional platform-specific skips and two failures in an existing breadcrumb-label assertion. The app labels that button “Part 3: Notes, Keys, and Chords”; the older test expected “Browse Part 3: Notes, Keys, and Chords, 5 of 6.” Redirects, pattern content and adjacent navigation were present. This change does not modify the shared navigation component or that test.

The earlier full web unit run had 1,958 passes and two unrelated failures: a missing `ml-active-learning` graphic and a Situations deletion-message mismatch (“context” versus “notebook”). Focused course/music/video checks pass. These historical full-suite results are not represented as a fresh full-suite run for this change.
