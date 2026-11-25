Project Guidelines
Context
This is a full-stack calculator project for a technical assessment.

Read docs/ASSESSMENT.md and docs/SPEC.md before proposing or implementing changes. The assessment contains the original requirements; the spec contains the approved implementation scope. If they conflict, report the conflict rather than silently changing either document.
Development Guidelines
- Prioritize correctness, readability, testability, and maintainability over extra features.
- Use React + TypeScript for the frontend and Go for the REST backend.
- Keep the solution small and idiomatic; avoid unnecessary dependencies and abstractions.
- Keep presentation, interaction state, API communication, HTTP handlers, and calculation rules separate.
- Treat Go as the source of truth for calculations and validation; frontend validation improves UX but does not replace backend validation.
- Follow the spec. Do not expand scope or revise agreed behavior without approval.
- Implement incrementally: the four required operations first, then advanced operations and contextual percentages.
- Document future extensions instead of implementing speculative features.
Workflow
- Before significant changes, briefly state the intended approach and files affected.
- Work in small, verifiable steps; avoid unrelated edits.
- Add or update tests whenever behavior changes.
- Run relevant tests and coverage checks when possible; report the exact commands and results.
- Never claim tests passed, files were verified, or functionality was deployed unless actually checked.
- Surface uncertainty, failures, and deviations from the spec.
- Do not modify docs/ASSESSMENT.md unless explicitly asked.
AI Usage Documentation
- Maintain AI_USAGE.md as a factual record of AI assistance used for this project.
- Record the exact available prompt text, tool, purpose, and a short outcome summary; include developer decisions and verification when known.
- Record only interactions actually accessible in the current context. Do not reconstruct missing prompts or invent decisions, test results, or approvals.
- Do not claim that all chat interactions are captured automatically. Flag any gaps for the developer to fill.
- Summarize generated code by changed files or commits; do not duplicate large outputs unless needed.
- Keep the log readable and update it as work progresses.