---
id: ml-datasheets-for-datasets
type: pattern
title: 'Datasheets for Datasets'
summary: 'Carry a dataset’s purpose, composition, collection history, label meaning, reuse conditions, and maintenance plan with a specific release so others can judge whether it fits their task.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

An engineer receives a folder of pump recordings and a table containing `fault_label`. The audio loads, the labels are integers, and a classifier trains successfully. Yet nobody can explain whether a row represents a machine or a short clip, whether faults were observed in service or deliberately introduced, or whether recordings from the same pump appear in both training and testing.

A Datasheet for a Dataset makes that missing context part of the handoff. It explains what the data represents, how it came to exist, and what a future user needs to know before drawing conclusions from it.

## Core idea

A dataset includes decisions as well as records. Which sources were accessible, which cases were excluded, who assigned labels, and what processing removed can all affect what the collection supports.

[Gebru and colleagues](https://arxiv.org/abs/1803.09010) propose documenting datasets through questions organized around seven lifecycle areas: motivation, composition, collection, preprocessing and labeling, uses, distribution, and maintenance. The framework serves both creators reflecting on their choices and consumers assessing reuse. Its questions are adaptable to the setting.

The result should connect a specific dataset release to evidence about its construction and limitations. “Unknown” can be an informative answer. A blank field or a confident guess conceals the same gap.

## How it works

Begin during collection planning, while the people making decisions can still explain them. Identify the dataset version, owner, intended task, unit of observation, sources, collection period, and selection rules. Keep dataset changes distinct from edits to its documentation.

Describe what each field means, especially labels and missing values. Record how annotations were produced, which instructions annotators followed, and how disagreements were handled. Explain relationships among records, such as repeated observations of one machine, person, or document. Document splits and why their boundaries fit the intended evaluation.

Connect the account to evidence: collection logs, annotation guidelines, transformation versions, inclusion counts, and known issues. Explain access conditions and distribution terms, where corrections can be reported, and how new versions or removals will reach downstream users. These details make the release usable beyond its original team.

Some domains need more specific questions. [Bender and Friedman’s Data Statements](https://aclanthology.org/Q18-1041/) address language resources and the populations from which they arise. For a speech corpus, language variety and recording context may matter more than a single language tag suggests.

## Worked examples

### Pump recordings, fictional

The invented release `pump-sounds 1.0` supports research on distinguishing normal operation from an induced bearing-fault condition. It contains ten-second, 16 kHz mono clips from forty pumps recorded indoors during January–March 2026. A label comes from the controlled run log, not from a subsequent breakdown or an independent diagnosis of every clip.

The collection starts with 12,000 candidate clips. Processing removes 300 unreadable files, then 900 duplicate copies, then 800 clips whose run condition cannot be verified. These are sequential, non-overlapping exclusions: **12,000 − 300 − 900 − 800 = 10,000** released clips. Unverified conditions are excluded rather than relabeled as normal.

The released audio totals **100,000 seconds**, or **27 hours, 46 minutes, 40 seconds**. That describes clip duration, not the number of independent pumps or continuous recording hours at each site. Repeated sessions from one pump remain related observations.

| Split      | Pumps | Released clips |
| ---------- | ----- | -------------- |
| Training   | 28    | 7,000          |
| Validation | 6     | 1,500          |
| Test       | 6     | 1,500          |
| Total      | 40    | 10,000         |

All clips from a pump stay in one split. The split therefore examines transfer to held-out pumps under these collection conditions. It does not test transfer to new factories, microphones, or naturally developing faults. The counts alone do not demonstrate that broader validity.

![A fictional datasheet connects 12,000 candidate pump clips to sequential exclusions and a 10,000-clip release from forty pumps. Training, validation, and test contain disjoint pump groups, while label meaning, use boundaries, and maintenance remain attached to version 1.0.](../assets/machine-learning/datasheets-for-datasets.svg 'Follow candidate clips through exclusions into a versioned release, then check the pump-disjoint splits. File counts describe audio content; pump counts identify the independent machines represented.')

A compact datasheet summary could read: “Internal research release, owner: Reliability Data. Unit: ten-second clip with a pseudonymous pump and session identifier. Labels: controlled normal or induced-fault run conditions. Transformations and exclusions: pipeline P4 and collection ledger C12. Pump-disjoint splits are fixed in manifest S1. Naturally occurring failures and outdoor conditions are not represented. Access is limited to approved internal research; redistribution requires separate review. Corrections are published through the release registry.” Supporting records would explain the source permissions and review process, rather than treating that summary as proof of authorization.

### A correction without a schema change, fictional

A later audit finds that 150 clips were joined to the wrong run conditions. Release 1.1 corrects those labels while retaining the same 10,000 clip identifiers and columns. That is **1.5%** of the release. A file-size comparison or schema check may miss the change entirely.

The updated datasheet records the affected identifiers, correction reason, pipeline revision, and consequences for label counts and splits. Published results must identify which release supplied their labels. If test labels changed, the old score describes the old benchmark; any recomputed score should name the corrected release. Documentation preserves that distinction, while the actual correction and downstream notification require operational work.

### A verified creator-authored datasheet

Cao and Daumé’s [GICoref datasheet](https://github.com/TristaCao/into_inclusivecoref/blob/master/GICoref/datasheet-gicoref.md) describes an English coreference dataset assembled to study gender-inclusive reference resolution. It explains source selection, annotation, and why the sample is deliberately unrepresentative of general text. It also distinguishes **95 unique documents from 96 annotated documents**: one ambiguous case has two annotation versions. These are the creators’ documented counts, not counts independently reproduced here. The explanation makes a potentially confusing difference between documents and annotation artifacts understandable.

## Assumptions for correctness

The account must describe the actual release, including the transformations used to produce it. Counts need explicit denominators and exclusion rules; overlapping reasons cannot simply be subtracted twice. Distinguish observed facts from judgments, intended uses, and unresolved questions.

Important statements need identifiable evidence or a clearly stated limit on what is known. People who collected or annotated the data should review the relevant sections. A datasheet cannot reconstruct a missing history through confident prose, and sensitive examples should not be exposed merely to make the account detailed.

## When to use it

Use this pattern when publishing, purchasing, inheriting, or sharing a training or evaluation dataset. It is especially useful when data may outlive its creators, move between teams, or be repurposed for a different population or task.

Use its questions during collection as well as at release. Discovering that a label cannot support the intended claim is more useful before a large annotation effort than after a model has been deployed.

## Tradeoffs and operating costs

Writing the summary is often cheaper than recovering provenance, clarifying annotation decisions, and maintaining correction channels. Owners need time to investigate unknowns and revisit answers as datasets change.

[Hugging Face Dataset Cards](https://huggingface.co/docs/hub/datasets-cards) provide a practical publishing convention: a repository README supplies descriptive text, with structured metadata for information such as language, license, and discovery tags. A dataset card can carry datasheet content, though the names do not guarantee identical coverage.

Automated counts and checks can support documentation. They cannot determine why sampling choices were made, whether a proposed reuse is appropriate, or which harms deserve attention. The original framework emphasizes human reflection rather than automatically filling every answer.

## Common mistakes and limitations

Do not equate many files with many independent subjects, a balanced label count with representative sampling, or successful loading with appropriate reuse. Labels often encode a procedure or proxy rather than the concept a later user hopes to predict.

A datasheet documents facts and responsibilities; it does not grant rights, establish consent, remove bias, enforce access restrictions, or replace evaluation. For changing datasets, identify snapshots or explicit coverage periods so that a moving collection does not inherit stale claims.

## Related patterns

[[ml-model-cards|Model Cards]] describe a trained model and its evaluation; a datasheet describes the data from which models and benchmarks are built. [[ml-schema-based-data-validation|Schema-Based Data Validation]] checks record contracts, while datasheets explain origins and meaning. [[ml-leakage-safe-evaluation|Leakage-Safe Evaluation]] implements boundaries that documented record relationships help identify. **Data Lineage** tracks transformations and dependencies; the datasheet interprets that history for dataset users.

## Sources and further reading

- [Gebru et al.: Datasheets for Datasets](https://arxiv.org/abs/1803.09010) — lifecycle questions, workflow, reflection, and limitations.
- [Cao and Daumé: GICoref datasheet](https://github.com/TristaCao/into_inclusivecoref/blob/master/GICoref/datasheet-gicoref.md) — a verified creator-authored implementation with explicit sampling and annotation details.
- [Bender and Friedman: Data Statements for NLP](https://aclanthology.org/Q18-1041/) — domain-specific documentation of language data and populations.
- [Hugging Face: Dataset Cards](https://huggingface.co/docs/hub/datasets-cards) — repository documentation and structured metadata.
- [Mitchell et al.: Model Cards for Model Reporting](https://arxiv.org/abs/1810.03993) — the neighboring model-documentation pattern.
