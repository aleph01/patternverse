# Article prompt 09: Steer Through Evidence

Create the complete illustrated Patternverse article **Steer Through Evidence**.

Intended collection: **Steer and Recover** within the proposed Agentic Coding catalogue.
Proposed article ID: `agentic-steer-through-evidence`; verify identity and overlap against the actual local catalog before using it.

## Article-specific brief

**Reader's question:** How do we know whether the approach is working before a large implementation accumulates?

**Central thesis:** Inspect representative results and choose experiments that distinguish plausible explanations before committing more effort.

**Mechanism and decisions to explain:**

- Choose checkpoints where evidence can change a decision, not a fixed requirement to approve every step.
- State competing hypotheses, design a discriminating check, and update the next action based on its result.
- Distinguish files changed, tests executed, and confident explanations from evidence that the intended behavior is improving.

## Developed example plans

1. Try the proposed CSV parser on malformed quoting and embedded newlines before building the full upload experience.
2. A request times out: distinguish slow parsing, database contention, and a disconnected worker using targeted observations.
3. A UI prototype resolves an uncertain interaction, but its success does not establish production readiness or scalability.

## Article-specific illustration briefs

1. Show a representative input passing through the proposed parser, with the observation that changes the implementation decision.
2. Draw three hypotheses, a discriminating observation, and the remaining possibilities without fictional probability estimates.
3. Separate prototype evidence from the unresolved production conditions.

Apply the approved light technical illustration design below to these subjects. Do not replace the concrete mechanism with a decorative diagram.

**Important limitations and distinctions:** A convenient example can be unrepresentative. Discuss investigation budgets, misleading proxies, and choosing a check that cannot distinguish the hypotheses.

**Candidate neighboring patterns:** Make Boundaries and Decisions Explicit; Keep Work Recoverable; Establish Independent Checks. Verify publication before making links.

**Research leads to verify:** Primary debugging and experimental engineering guidance; documented agent-harness experience with early feedback.

## Audience, scope, and editorial standard

Write a complete illustrated Patternverse field-guide article for readers with basic software-development knowledge who work with coding agents. Aim for 1,000–1,500 words of connected explanatory prose; expand only where a developed example needs the space. Open with a recognizable problem and teach a distinct, reusable engineering response. Explain the mechanism, decisions, artifacts, checks, and limitations. Avoid generic tips, motivational filler, unsupported productivity promises, and repeated summaries.

Keep the focus on engineering practice. Include technical collaboration and Agile delivery where they change the engineering decisions; omit personnel management, hiring, compensation, and career advice. Distinguish product acceptance criteria, a team's Definition of Done, an agent task's stopping condition, a reviewable change, integration, and release. A story, agent session, branch, commit, and pull request need not correspond one to one. Do not imply Scrum is the only Agile approach or prescribe extra ceremonies.

## Exact article structure

Use these exact level-two headings, in this order. Put topic-specific subsections at level three. Write substantive prose within the sections rather than turning the whole article into a checklist.

1. Purpose and problem
2. Core idea
3. How it works
4. Worked examples
5. Assumptions for correctness
6. When to use it
7. Tradeoffs and operating costs
8. Common mistakes and limitations
9. Related patterns
10. Sources and further reading

The mechanism belongs in How it works; explain why the intervention changes the situation. Develop the three supplied example plans when they teach different decisions. You may consolidate to two if the third repeats the same lesson; preserve a contrast or failure case. Each developed example should contain context and goal, initial state, diagnosis, specific intervention, inspectable evidence or artifact, result, and remaining limitations. Use concrete requirements, sample inputs, short diffs, commit graphs, acceptance tables, or review findings where they clarify the decision. Label invented cases and numerical fixtures as hypothetical. Never present an expected effect as a measured outcome.

## Approved illustration design: light technical illustrations on white

Use the approved Architecture light-editorial visual language, adapted to software mechanisms. Inspect docs/pattern-packages/architecture-illustration-style.json, scripts/architecture-editorial-visuals.mjs, and the existing architecture SVGs before composing figures. These are style references, not instructions to import architectural subject matter or modify the Architecture collection.

- Produce original, precise, editable SVG illustrations grounded in the worked examples. Use concrete artifacts, state transitions, dependency graphs, timelines, or comparisons that explain this particular pattern. Avoid decorative AI imagery, generic process posters, photographic mockups, and simulated product screenshots that add no explanatory information.
- Keep the figure surface white (#ffffff) in both light and dark appearances. Use ink #252c28, secondary lines #a6aca3, pale neutral #f1f2ef, pale green #edf5f0, and restrained accent #00855b. Match the approved style's regular Helvetica Neue type with Helvetica/Arial fallbacks, fine consistent strokes, whitespace, and sparse direct labels. No gradients, ornamental shadows, or oversized promotional titles inside figures.
- Reserve the accent for the intervention or relationship being explained. Use labels, line styles, marks, or shapes as well as color to communicate differences, failures, and authority boundaries. Keep labels legible against the fixed light surface in dark mode.
- Create a useful illustration for each developed example, or combine related examples into a clearer shared figure. Explain any consolidation. Every figure must teach a specific relationship; do not add a quota-filling diagram. Show the scenario's actual names, states, dependencies, or values rather than replacing its mechanism with abstract boxes.
- Comparisons must retain relevant inputs and unrelated conditions. Make the changed variable explicit. Clearly distinguish logical dependency, chronology, review state, integration, and serving authority; arrows must have defined meanings. Illustrative commit labels must be visibly fictional.
- Supply separate desktop and phone compositions using existing responsive-asset conventions. Recompose and stack for narrow screens rather than shrinking a wide diagram until text is unreadable. Use captions for longer explanations; keep labels short and close to their subject, with leaders where needed.
- Include descriptive alternative text and a caption explaining the intervention, result, and important limitation. Inspect the saved/rendered illustrations at actual article widths. Check text bounds, overlap, clipping, contrast, reading order, and horizontal page overflow. Do not rely on source markup alone as visual QA.

Interaction is optional. Add an explorer only if changing a parameter or stepping through a real mechanism materially improves understanding. It must compute its stated results or replay an explicitly labeled fixed scenario, state assumptions, have a useful static preview and reset controls, and work on desktop and phone. Do not simulate real agent behavior, success rates, or productivity without evidence. A good static diagram is sufficient.

## Research and correctness

Research the specific claims before drafting. Open and read relevant primary documentation, original research, or identifiable engineering guidance; the supplied research leads are starting points, not verified citations. Verify current tool behavior if describing it. Separate established software practice, documented observations about specific coding agents, and original editorial synthesis. Do not invent citations, deployments, benchmarks, numerical results, or guarantees. Independently verify any calculated example. State important evidence gaps and qualify or remove unsupported claims.

Give two to four related patterns with explanations of their boundaries. Inspect the local catalog and link only to existing entities. Titles in the proposed 18-pattern catalogue are candidate neighbors, not evidence that their articles exist. Use plain text for unauthored neighbors. Do not recreate an existing pattern under a fresh identifier without first resolving the overlap.

## Repository integration and delivery

If working in the Patternverse repository, inspect applicable repository instructions, current content schema, routing, collections, illustration rendering, and metadata conventions first. Reuse the Machine Learning guide's ten-section structure and the approved light illustration style. Inspect existing Data Engineering and Business examples where accessible, without assuming their file paths. Keep richer metadata, sources, and 8–15 natural-language recommendation queries in the established sidecar format rather than inventing frontmatter fields. Omit guided practices and worksheets.

Integrate the authored article and assets as a draft, reusing an existing appropriate verse/collection where available. If a draft navigation entity is needed, add only the minimal populated structure; do not create stubs for the other planned articles. Reuse supported asset dimensions, relative image references, responsive companions, captions, and full-size access. Preserve other agents' work and follow the repository's GitButler instructions for version-control operations. Do not commit, push, publish, deploy, or open a pull request merely because this prompt requests an article.

Run relevant content/schema/link validation and independently verify the worked examples. Inspect the actual article, SVGs, and any optional explorer on desktop and phone; inspect the fixed-white figures in dark appearance as well. Do not add tests that merely repeat the prose, and do not claim checks that were not performed. Introduce no dependency unless clearly necessary. Report created or changed files, a usable local preview when available, completed checks, and any unfinished visuals or evidence gaps. If no repository or visual-production tools are available, deliver the article plus explicit illustration production briefs and identify those assets as unfinished.
