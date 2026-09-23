# ADR 0002: One active provider per workspace

**Status:** accepted

A personal workspace has at most one active remote store. Multiple simultaneous remotes
would require a second distributed-consistency layer and ambiguous conflict bases. Provider
migration will use an explicit export/import or future migration workflow.
