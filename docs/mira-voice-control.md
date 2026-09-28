# Mira voice control

The waveform button is a separate mode from the microphone's existing dictation.
It stays active in the foreground until explicitly stopped or until the platform
cannot continue. It is not a background wake-word assistant.

## Interaction contract

- Ordinary speech drafts a message. Only a standalone “send” / “send it” sends it;
  interim recognition never executes an action. Say the message, pause, then send.
- “Open patterns” opens the existing selector. “Search for grounding” updates its
  search. “The second one” selects the second **visible** numbered result.
- Selecting only previews. A separate “start” starts an executable technique or
  attaches an article as conversation context. These are visibly distinguished.
  “Dismiss” closes the selector and clears the pending selection.
- “Choose therapy approach” opens a searchable numbered selector; “switch to CBT”
  selects that approach directly. This uses the existing modality transition.
- “Read the last reply” reads the latest assistant response with device speech.
  Capture pauses during readback to prevent speech output becoming a command and
  resumes afterward. The reply's stop button interrupts readback. Stopping voice
  control while reading prevents automatic listening restart.
- “Open settings”, “show previous sessions”, “close”, and “stop listening” are
  direct commands. Feedback is visual; there are no spoken confirmations.
- Exercise answers still use the exercise's own response controls. This change
  adds exercise selection/start, not a new Pattern Markdown interaction adapter.

## Boundaries and privacy

`voice-commands.ts` and `voice-segmentation.ts` are pure functions. The former
defines intent parsing, result filtering and validation of model-proposed actions;
the latter detects bounded speech segments from audio energy.

`voice-controller.ts` owns the listening lifecycle through injected ports. It
serializes commands, invalidates late recognition after stop, cancels model
interpretation and rejects its results when the menu/session context changes.
Model interpretation has a 20-second abort deadline. The model cannot send a
message or start an exercise; only explicit deterministic commands can do so.
An unrecognized model intent in chat preserves the utterance as a draft.

`browser-voice.ts` uses browser speech recognition, deduplicates final results
and restarts after normal end events. Permission/network errors and repeated
immediate ends stop with visible feedback. Browser speech processing may be
remote and is **not covered by OpenRouter ZDR**. Continuous support and restart
behavior depend on the browser; installed iPhone PWA testing remains necessary.

`native-voice-listener.ts` records bounded microphone segments, strips leading
silence and serializes transcription through bundled local Whisper. Audio never
goes to a cloud transcription service. Recordings cap at 20 seconds, use a
900-millisecond silence boundary, and stop with feedback if transcription falls
more than three segments behind. The fixed energy threshold needs real-microphone
testing across quiet voices and noisy rooms. Audio and control feedback are not
persisted as conversation messages.

Ambiguous command-shaped utterances use the currently selected local model on
desktop or OpenRouter in the PWA, with mandatory `zdr: true`, data collection
denied and provider fallbacks disabled. Only that utterance and menu labels are
provided—not the chat transcript, draft or API key. Browser interpretation uses
API credits and refreshes the existing reported-cost overview. It never switches
to cloud inference on desktop. Missing connectivity/model availability leaves
direct commands available and reports the interpretation error.

UI integration reuses the same actions for clicks and speech. A visible stop
control remains available in the chat and each supported panel. Backgrounding
the document or leaving Mira stops listening and releases capture resources.

## Verification

Unit tests cover parsing, validation, segmentation, deduplication/restart,
interim-versus-final delivery, cancellation, stale session results and readback
pause/resume. Browser tests use synthetic speech results on desktop and phone
viewports to verify draft-only speech, explicit sending, pattern search/preview/
start and modality selection. They do not establish microphone quality, iOS
recognition reliability or audible playback.

Manual acceptance: test quiet/normal speech on macOS, permission denial, iPhone
Safari and installed PWA restart, screen lock/background, readback completion and
interruption, rapid commands, and a long utterance. Confirm the mic indicator
disappears after stop/navigation. No website deployment is implied by this change.
