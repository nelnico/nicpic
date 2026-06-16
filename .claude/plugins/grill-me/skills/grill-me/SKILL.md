---
name: grill-me
description: >
  Use this skill BEFORE starting any implementation task. This skill MUST fire
  whenever the user proposes a new feature, asks for new functionality, wants
  to delete or remove something, change permissions, add a field, modify a
  schema, integrate an external service, or describes any change that touches
  more than one file. Do not trigger for: single-line typo fixes, pure code
  explanations, or follow-up messages that continue an already-agreed plan.
  The goal is to eliminate every assumption before a single line of code is
  written. When in doubt, trigger this skill.
---

# Grill Me

Before writing any code, reach complete understanding. The goal: zero open
assumptions, every affected area considered, and a shared mental model between
you and the user.

## Step 1 — Explore first, ask second

Before asking the user anything, search the codebase for what you can answer
yourself:
- What models/tables/components are involved?
- Are there existing delete/update/permission patterns to follow?
- What does the current data shape look like?
- Are there related features that would be affected?

If the codebase answers a question, note what you found and use it as your
recommended answer. Only ask the user what the code cannot tell you.

## Step 2 — Draft your questions

Cover every applicable category. Skip categories that genuinely don't apply
(e.g., no "external service" questions for a UI-only change).

**Scope**
- What is explicitly in scope? What is explicitly out of scope?
- Are there edge cases that sound in-scope but might not be?

**Data & state**
- What happens to existing records when this change rolls out?
- What's the default value / fallback for any new field?
- Are there null / empty / zero cases to handle?

**Side effects**
- What other entities or features are affected?
- Does anything downstream depend on what's changing?

**Delete / removal operations** (if applicable)
- Hard delete or soft delete (recoverable)?
- What happens to related records — cascade, nullify, block, or orphan?
- Who is allowed to trigger this? Any confirmation step?

**Permissions & access**
- Which roles can do this? Which can't?
- What happens when someone without permission tries?
- Are there admin overrides?

**Error cases**
- What happens when input is invalid?
- What happens when a dependency fails (API down, file missing, etc.)?
- How are errors surfaced to the user?

**Reversibility**
- Can this be undone by the user? By an admin? Not at all?

**Notifications & side-channel effects**
- Should anything trigger emails, logs, webhooks, or UI alerts?

**Validation**
- What input is valid vs. invalid? Any length / format / uniqueness rules?

**Definition of done**
- What does "this is working correctly" look like? What would you test?

## Step 3 — Ask in one shot

Present all questions in a single message. Group them by category. For each
question, include a recommended answer — give the user something to react to,
not a blank. If you'll assume a default if they don't answer, say so.

Format each question like this:

> **[Category]**
> Q: [Specific, concrete question — use examples where possible]
> My take: [Your recommended default / assumption]

Use concrete examples: "If User A deletes their account, what happens to the
reviews they left on photos?" beats "What happens to related records?"

## Step 4 — Confirm and get a green light

After the user responds, restate the key decisions in 2-3 sentences. Name any
remaining open questions. Then ask explicitly: "Does this match what you had
in mind? Say go and I'll start."

Only begin implementation after an explicit go-ahead.

## What NOT to do

- Do not ask one question at a time. Batch everything.
- Do not start implementing while questions are open.
- Do not ask the user things you can discover by reading the code.
- Do not grill on changes that are clearly trivial (typo, rename, single-line fix).
