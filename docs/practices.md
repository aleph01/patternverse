# Interactive Practices

Interactive Practices turn procedural knowledge into a focused, step-by-step activity without
making private responses part of the knowledge corpus. Worry Exposure is the first complete example;
the engine itself is domain-neutral.

## Structure

`PracticeDefinition` is the single model used by the compiler, visual builder, serializer, and
runner:

```ts
type PracticeDefinition = {
  title: string;
  introduction?: string;
  steps: PracticeStep[];
};

type PracticeStep = {
  id: string;
  title?: string;
  blocks: PracticeBlock[];
};
```

Every Practice has a title and at least one step. Every step has at least one block. Step IDs are
unique within the Practice and block IDs are unique across the entire Practice; array positions are
never used as durable identity.

Three block types are supported:

- `markdown`: an ID and required Markdown `content`. It uses Patternverse's safe renderer; raw HTML
  stays disabled.
- `text-input`: an ID, label, explicit `multiline` and `required` booleans, plus an optional
  placeholder.
- `timer`: an ID, positive integral `defaultDurationSeconds`, explicit `userAdjustable`, an optional
  label, and optional `persistent`. Persistent timers remain above the changing step content. The
  maximum duration is 24 hours.

No block may execute JavaScript. Branching, scoring, conditional fields, persistence, and calculated
values are intentionally outside this version.

## Embedded and standalone Practices

A Pattern can contain one optional `patternverse-practice` fenced YAML block. Normal article Markdown
surrounds the fence and remains the primary reading experience. The compiler removes the machine
block from rendered prose and attaches its normalized definition to the compiled Pattern.

A standalone entity with `type: practice` can use the same block. The architecture keeps that route
open, but Worry Exposure is represented once as an embedded Practice rather than duplicated as a
second entity.

## Reading and doing

The Pattern article remains at `/pattern/worry-exposure`. When a Practice exists, a restrained
**Begin Practice** action links to `/pattern/worry-exposure/practice`. Patterns without a Practice do
not show the action.

The runner opens directly on its first step and then shows one step at a time. Required inputs block
forward navigation with an associated field error. Back navigation retains inputs and timers during
the current open session. Persistent timers stay visible above every step. Completion clears the
session and returns to the Pattern.

## Privacy

Responses and timer state exist only in the runner's in-memory session. They are not written to:

- IndexedDB or personal Markdown;
- Dropbox or another `RemoteCorpusStore`;
- analytics or logs;
- the compiled corpus.

Leaving the route, completing the Practice, reloading, or closing the app loses the open session.
There is no Practice history or Save Session function.

## Timer behavior and limits

Authors store durations in seconds; the UI presents whole minutes. Adjustable timers can be changed
before Start. Start, Pause, Resume, and Reset are explicit, and completion never advances the step
automatically. Remaining time is derived from wall-clock timestamps, avoiding interval drift when an
open tab is throttled.

The timer does not promise background execution after the PWA closes, notifications, vibration,
sound, or reliable execution while the operating system suspends the browser.

## Authoring

Pattern authors can switch between **Article** and **Practice** in the local editor. Enabling a
Practice creates a valid first step. The builder supports:

- Practice title and optional introduction;
- adding, moving, duplicating, and deleting steps;
- adding, moving, duplicating, deleting, and editing the three block types;
- safe Markdown block previews and a complete Practice preview.

Builder operations update `PracticeDefinition` immutably. Duplicate operations generate new step and
block IDs. Invalid intermediate drafts remain visible in the editor, while saving reports schema
errors instead of discarding the draft.

On save, the serializer inserts or replaces the fenced YAML block. Parsing that saved Markdown must
produce an equivalent `PracticeDefinition`. When replacing an existing fence, unrelated article
Markdown is preserved exactly; adding a new fence appends it after the article with a blank separator.

The Commons example is in `content/patterns/worry-exposure.md` beneath the Therapy Verse and Cognitive
Behavioral Therapy Collection.
