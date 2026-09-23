# Patternverse content format

Each corpus contains a `patternverse.yaml` manifest:

```yaml
id: commons
name: Patternverse Commons
schema_version: 1
```

Content lives in type-oriented directories beneath `content/`; directory names do not determine an
entity's identity or relationships.

## Base frontmatter

Every entity has:

```yaml
id: creative-reframing
type: pattern
title: Creative Reframing
summary: Change how a problem is represented before trying to solve it.
status: published
aliases:
  - Problem Reframing
verses:
  - creativity
```

`id`, `type`, `title`, and `status` are required. IDs use lowercase kebab case and remain stable after
publication. Supported statuses are `draft`, `published`, and `deprecated`.

V1 entity types are `pattern`, `concept`, `practice`, `collection`, and `verse`. There are no tags.
Unknown fields in published Commons content are validation errors.

## Entity-specific fields

- **Pattern** and **Concept** add no required fields.
- **Practice** may have `implements` (Pattern IDs) and `duration_minutes`.
- **Collection** has an authored, presentation-ordered `items` list. The list is not a workflow.
- **Verse** has no `items`; other entities reference Verse IDs through `verses`.

Collections may contain Patterns, Concepts, Practices, and Collections, but not Verses. Collection
cycles are invalid.

## Wiki links

```markdown
[[creative-reframing]]
[[creative-reframing|reframe the problem]]
[[commons:creative-reframing]]
```

Unqualified links resolve in this order: personal Workspace, current Source, Commons, unresolved.
Resolution and backlinks are compiler responsibilities.

## Interactive Practices

A Pattern may optionally contain one declarative Practice using the `patternverse-practice` fence.
Standalone Practice entities can use the same representation. The definition is ordered steps, each
containing ordered, uniquely identified blocks:

````markdown
```patternverse-practice
title: Reframe a problem
introduction: Work through one situation in a few focused steps.
steps:
  - id: describe
    title: Describe the situation
    blocks:
      - id: describe-guidance
        type: markdown
        content: Write down the current representation of the problem.
      - id: situation
        type: text-input
        label: What is happening?
        multiline: true
        required: true
      - id: reflection-timer
        type: timer
        label: Reflection time
        defaultDurationSeconds: 300
        userAdjustable: true
        persistent: true
```
````

Supported block types are `markdown`, `text-input`, and `timer`. Step IDs must be unique; block IDs
must be unique across the whole Practice. Timer durations are positive integral seconds with a
24-hour maximum. An optional `persistent: true` keeps a timer above every step. Branching,
conditions, scoring, scripts, and arbitrary JavaScript are not part of the format. See
[Practices](./practices.md) for the complete model and privacy behavior.

## Validation and compiled output

Milestone 1 validates the complete V1 format. Published Commons files reject unknown fields, invalid
IDs, malformed frontmatter, broken or mistyped references, Collection cycles, unsupported Practice
steps, duplicate response keys, duplicate IDs, and Verse entries in Collections. Imported personal
drafts may downgrade unknown top-level fields to warnings; those fields are ignored rather than
silently interpreted.

`pnpm compile:content` writes a normalized machine-readable corpus to `generated/commons.json`.
Development output includes drafts. `pnpm compile:content:production` excludes Commons drafts. The
generated artifact includes derived relationships and search documents, while Markdown remains the
canonical authored representation.

## Reading and safety

Public pages render headings, lists, blockquotes, links, images, tables, code, and emphasis through a
Markdown AST pipeline. Wiki links are replaced only in ordinary Markdown text nodes, so code examples
remain literal. Raw HTML is not passed through, unsafe URL schemes are removed during sanitization,
and `patternverse-practice` YAML is kept out of the reading article. The parsed structured Practice
remains available separately for the directly addressable Practice runner.
