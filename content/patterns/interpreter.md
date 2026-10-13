---
id: "interpreter"
type: "pattern"
title: "Interpreter"
summary: "Model a small language through expression objects that evaluate its grammar."
status: "published"
tags:
  - "gof-design-patterns"
  - "object-oriented-design"
  - "behavioral"
  - "interpreter"
verses:
  - "software-engineering"
attribution: "Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package."
---

A filtering tool starts with a few fixed options: unfinished tasks, high-priority tasks, and tasks due soon. Users then ask for combinations: unfinished and due soon, or assigned to me and not blocked. A growing collection of flags becomes difficult to extend. The emerging need is a small language for expressing rules.

Interpreter represents that language through expression objects. Each expression type corresponds to a meaningful grammar construct and knows how to evaluate itself in a context. Larger expressions combine smaller ones according to the grammar.

![Compound expressions recursively evaluate terminal expressions against a deliberate task context.](/diagrams/gof/interpreter.svg "Compound expressions recursively evaluate terminal expressions against a deliberate task context.")

### Grammar, structure, and evaluation

A tiny task language might have terminal expressions such as IsUnfinished and AssignedTo, plus compound expressions And, Or, and Not. And contains two expressions and evaluates their conjunction. Not contains one expression and reverses its boolean result.

The resulting expression structure often forms a tree. An evaluation context supplies the current task, user, and any other deliberately available values. The expression objects give the language its meaning by interpreting themselves against that context.

Parsing is a separate concern. Converting a string such as unfinished AND due_before(today) into an expression tree requires tokenization, grammar rules, and error reporting. Interpreter describes the evaluation structure; it does not automatically provide a parser or a safe general-purpose evaluation facility.

### Composable task filters

Suppose a saved filter is And(IsUnfinished, Not(IsBlocked)). Evaluation checks the two terminal properties and combines the results. The filtering interface can construct this tree directly through menus, avoiding textual syntax entirely.

Before this design, the application stores loosely structured flags and uses a central conditional block to infer combinations. Afterward, a saved filter has an explicit recursive representation. Adding a new terminal such as AssignedTo(user_id) gives the language another domain predicate.

Semantics still need precision. Does a missing due date make DueBefore return false, unknown, or an error? Does And short-circuit if the first operand is false? Are string comparisons case-sensitive? These decisions affect user-visible results and should not emerge accidentally from implementation details.

Serialization also needs stable meaning. A stored expression should identify its operation and arguments in a way that can be versioned. Renaming an internal class should not silently break every saved filter.

### A compact rule for discounts

An internal catalog tool lets staff define eligibility rules such as a customer belonging to a specified group and an order exceeding a threshold. Expression objects include InGroup, AboveAmount, And, and Or. The rule evaluates against a deliberate context containing the customer and order data.

The language stays focused on eligibility. It does not expose arbitrary application objects, network requests, or unrestricted code execution. That makes it easier to understand the available operations and reason about their effects.

Nevertheless, even a small language can consume excessive resources if deeply nested or very large expressions are allowed. Limits on expression depth, node count, or evaluation work may be appropriate. Interpreter is a structure for semantics, not a comprehensive sandbox.

The example also shows where the pattern may become awkward. If users need aggregation, joins, temporal rules, rich diagnostics, and interactive authoring support, a mature rules or query system may be more suitable than adding dozens of expression classes.

### Why the smallness matters

Interpreter is most manageable when the grammar is compact and stable, and when the domain benefits from explicit composable expressions. Mapping each construct to an expression type makes the language's vocabulary visible and gives simple evaluation behavior a local home.

As a language grows, this mapping can produce many classes and repeated operations. Evaluation may be only one of several needs: validation, pretty printing, optimization, compilation, and dependency analysis. Keeping every operation inside every expression type can make the design increasingly difficult to evolve.

Performance can also matter. Repeatedly interpreting a large tree may be slower than compiling a rule to another representation. That does not make Interpreter wrong; it clarifies that an expression model and an execution strategy are different decisions.

Directly applying a language runtime's unrestricted eval to user input is not equivalent to building a domain interpreter. It delegates meaning and capability to a much larger language than the application likely intends. A constrained grammar should have a constrained set of operations and a deliberate context.

### Neighboring designs

Composite often supplies the tree structure: terminal expressions are leaves and compound expressions contain children. Interpreter adds language meaning through evaluation. Not every composite tree represents a grammar.

Visitor can place evaluation, validation, or formatting operations outside the expression classes, particularly when the node family is stable and operations proliferate. The language can retain its expression model while changing how operations are organized.

Strategy offers interchangeable algorithms for a task. An interpreted rule can act as one strategy, but Interpreter additionally provides a language for constructing the rule itself.

The useful design pressure is a recurring need to express combinations that are richer than fixed options but smaller than a general programming language. Interpreter works when that middle ground remains narrow enough to explain, validate, and maintain.

## Pattern details

**Category:** Behavioral · **Difficulty:** Advanced

### Use when

- A compact recurring expression language needs domain-specific meaning
- Grammar alternatives map cleanly to a small set of expression types

### Not ideal when

- The language is large or requires sophisticated parsing and tooling
- A mature parser or query language already meets the need

### Prerequisites

- Basic familiarity with objects, interfaces, composition, and inheritance

## Related patterns

[[composite|Composite]] · [[visitor|Visitor]] · [[strategy|Strategy]]

## Source

Canonical names and classification: Gamma, Helm, Johnson, and Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software. Original educational prose and diagrams supplied in the GoF Patternverse article package.

[Canonical GoF reference](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-software-9780201633610)
