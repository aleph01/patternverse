---
id: "command"
type: "pattern"
title: "Command"
summary: "Represent an operation as an object or value so it can be stored, scheduled, or composed."
status: "published"
tags:
  - "gof-design-patterns"
  - "object-oriented-design"
  - "command"
verses:
  - "software-engineering"
attribution: "Pattern names and original designs: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original Patternverse educational explanations, code, and illustrations."
---

## Purpose and problem

A text editor lets a user delete a selection through a menu, a keyboard shortcut, or a toolbar button. Each interface path currently edits the document directly. Adding undo means every path must remember what changed. Adding queued actions or macros makes the coupling even harder to manage.

## Core idea

Command gives the operation an explicit representation. A DeleteSelection command contains the information needed to request deletion and exposes an execution operation. Interface controls create or invoke the same action representation instead of each implementing the effect independently.

![A menu or shortcut constructs a DeleteRange command. The invoker executes it against Document and stores the command in history. Undo is later requested through the command, whose saved state supports restoration under the stated no-intervening-edit assumption.](../assets/software-engineering/gof/command.svg "The invoker controls execution and history. The command holds a request and the information needed for its supported undo.")

## How it works

The classic roles are a command, a receiver that performs domain work, and an invoker that decides when to execute. The command bridges the invoker and receiver. An undoable command may also retain information required to reverse its own effect.

A command need not be a class with one method. In a suitable language, a closure can package behavior and captured values. An immutable command message can package intent for a separate handler. These forms preserve the key separation between representing an operation and deciding when or where it runs.

Making the request explicit supports queuing, logging, scheduling, composition, and history. It also introduces questions that an immediate call did not need to answer: how long the request remains valid, who owns execution, and whether repeated execution is allowed.

## Worked example

### Deleting text with a meaningful undo

Suppose a deletion command records the target document, the selected range, and the removed text. Execution removes the range. Undo restores the captured text at the corresponding location, subject to the editor's history rules.

The menu and shortcut now use the same operation. A history manager stores executed commands and moves through them in the defined order. Redo reapplies the action when the model permits it.

The captured information must match the moment of execution. If a command sits in a queue while the document changes, an old numeric range may refer to different text. The system may need stable anchors, a version check, or immediate execution for interactive editing.

Undo is also not automatically the inverse method name. Deleting a shape may remove connectors, update selection, and change layout. Reversing that operation requires restoring the meaningful affected state, not merely creating a new shape with the same label.

### A small implementation

An editor action stores the information needed to invoke a receiver later. The history belongs to the invoker. This deletion command supports undo only when it is the most recent edit and nothing has changed the document since execution.

```python
from dataclasses import dataclass


@dataclass
class Document:
    text: str


class DeleteRange:
    def __init__(self, document, start, stop):
        self.document = document
        self.start, self.stop = start, stop
        self.before = None

    def execute(self):
        self.before = self.document.text
        self.document.text = (self.before[:self.start]
                              + self.before[self.stop:])

    def undo(self):
        if self.before is None:
            raise RuntimeError("Execute before undo")
        self.document.text = self.before
        self.before = None


document = Document("Hello world")
command = DeleteRange(document, 5, 11)
history = []
command.execute()
history.append(command)
print(document.text)
history.pop().undo()
print(document.text)
# Hello
# Hello world
```

A menu and a keyboard shortcut can construct the same command. The receiver remains the document, and history decides when undo runs. Restoring the previous text is an intentionally small demonstration; concurrent edits, range validation, redo, and persistent history require stronger policies.

### A background export request

A web interface creates an ExportProject command containing a project identifier, requested format, destination, and relevant version. A worker receives that request later and uses application services to perform the export. The interface does not need to hold a live exporter or know the worker's execution sequence.

Representing the request as data makes it possible to inspect pending work, record outcomes, and route execution. It also requires a policy for stale inputs: should the worker export the project version selected at request time, or the latest version available when it runs?

Retries need explicit semantics. If an export is written under a unique operation identifier, a repeated request may be recognized and reconciled. If each retry blindly produces another output, the user may get duplicates. Command provides a place to express identity and intent, but does not itself guarantee idempotency or durable delivery.

Serialized command messages also evolve. A worker running an older version may not understand a new field or action type. Persistent queues require a compatibility policy beyond the in-memory object pattern.

## When to use it

- Actions need to outlive the UI event that created them.
- Operations need queuing, history, or explicit execution ownership.

Consider a simpler design when a direct function call already expresses the complete need, or when the design assumes every operation can be automatically undone.

## Tradeoffs and common mistakes

Commands are useful when several invokers share an action, when execution is delayed, or when operations need an explicit lifecycle. Composite commands can group several actions into a larger intention, such as inserting a section and its default content.

Grouping does not automatically make the effects atomic. If the third action fails after two succeed, the invoker needs a rollback, compensation, or partial-result policy. The command interface should distinguish successful completion from merely starting an action.

Some operations cannot be fully undone. Sending a message cannot remove the recipient's knowledge. A compensating action may address part of the effect, but it is not a literal restoration of the earlier world. Labeling compensation as undo without qualification creates misleading expectations.

For small synchronous work, a direct call may be easier to understand. Turning every setter into a command can create an elaborate architecture without a corresponding need for history, scheduling, or decoupled invocation.

## Related patterns

[[memento|Memento]] captures state for later restoration. A command may use a memento to implement undo when reconstructing the inverse effect is difficult. Command represents the operation; Memento represents the saved state.

[[strategy|Strategy]] packages an interchangeable algorithm chosen by a context. Command packages a request that an invoker can execute. Their executable forms can resemble each other, but their lifecycle and purpose differ. [[chain-of-responsibility|Chain of Responsibility]] can decide which handler accepts a command without changing how the request is represented.

## Sources

Command is one of the 23 patterns in Gamma, Helm, Johnson, and Vlissides, [*Design Patterns: Elements of Reusable Object-Oriented Software*](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-9780201633610). The examples, code, and illustrations here are original educational explanations.
