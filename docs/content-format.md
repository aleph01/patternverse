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

A Pattern or standalone Practice can contain one `patternverse-language` fence.
Its source is parsed and executed by the shared Rust Pattern Language engine, not
a separate website interpreter. Articles keep their existing YAML frontmatter.

````markdown
```patternverse-language
:language 1
:title "Reframe a problem"
situation = !form {
  :title "Describe the situation"
  !show {
Write down the current representation of the problem.
  }
  !ask description {
    :required true
    :multiline true
What is happening?
  }
  !ask note {
    :required false
    :multiline false
Anything else?
  }
}
!show {
Your description: {{situation.description}}
}
-> end
```
````

The corpus exposes `languagePracticeSource` separately from article content.
Grouped forms use existing typed records, templates and timer contracts. Branching,
choices, ratings, collections and other supported language statements can appear
between forms. JavaScript and arbitrary HTML remain unsupported. See
[Practices](practices.md) and the [language reference](pattern-markdown/README.md).

Legacy `patternverse-practice` YAML remains readable for import. The shared converter
preserves grouped steps and field settings; new editor saves write Pattern Language
only. Malformed or ambiguous source is reported rather than silently replaced.

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
and both executable language fences and legacy import fences are kept out of the
reading article. Language source remains available separately to the shared runtime.
