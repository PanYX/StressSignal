# Orchestrated Subagent Execution Mode

## Purpose

This mode is a collaboration pattern for large or ambiguous work where one main agent acts as the orchestrator and all substantive task work is delegated to subagents.

The orchestrator is the project manager and technical traffic controller for the requirement. It owns sequencing, dispatch, plan updates, and final acceptance, but it does not participate in the detailed execution of implementation tasks.

The goal is to keep:

- orchestration centralized
- execution delegated
- state externalized into durable documents
- task handoffs compact and auditable

## Core Principles

- Each requirement run is anchored to one explicit top-level objective that stays active until it is complete or a real blocker is declared.
- One main agent owns global orchestration for the requirement.
- All substantive task work is delegated to subagents.
- Each execution task is assigned to a fresh subagent.
- Subagents may run for a long time if the task requires it and should not be closed early just because they are still working.
- The orchestrator should not pressure or micromanage an active subagent. It waits for a result, a blocker, or a checkpoint.
- A checkpoint is progress metadata, not a task handoff, acceptance event, or permission for the orchestrator to take over implementation.
- Task-level `BLOCKED` and `NEEDS_REPLAN` judgments belong first to the active subagent. The orchestrator may identify orchestration-level staleness, but it should not infer technical blockage from a short wait or a missing diff.
- The orchestrator must not convert a delegated implementation task into self-execution because of impatience, retry churn, short polling intervals, or checkpoint-only updates. It must re-scope, re-dispatch, pause, or escalate instead.
- Execution follows a written orchestration artifact instead of ad hoc task selection.
- The orchestrator owns plan mutation. Subagents may propose plan changes, but they do not directly rewrite the global execution order.
- Subtask or milestone completion is not a valid reason to stop while required work for the top-level objective still remains.
- After any subagent returns a terminal packet, the orchestrator must either dispatch the next ready task, dispatch review or verification, or declare a concrete blocker.
- Every requirement gets its own workflow directory so the process can evolve, pause, resume, or archive without touching the product code layout.

## Information Flow

Subagents do not communicate with each other directly. All information passes through durable files in the workflow directory, with the orchestrator controlling what each subagent receives.

- Subagents that produce durable output write it directly to the workflow directory and return file paths to the orchestrator.
- The orchestrator does not rewrite or transcribe subagent output into separate documents.
- The orchestrator assembles context for downstream subagents by referencing file paths, not by duplicating content.

## Role-Specific Guides

This mode defines five roles. Each has a dedicated guide that the relevant subagent reads before starting work.

| Role | Guide | Who reads it |
|------|-------|-------------|
| Orchestrator | [orchestrator.md](docs/workflow/orchestrator.md) | The orchestrator only |
| All subagents | [subagent-contract.md](docs/workflow/subagent-contract.md) | Every subagent, before starting any task |
| Discovery / Explorer | [discovery-guide.md](docs/workflow/discovery-guide.md) | Discovery and planning subagents |
| Task Owner | [task-owner-guide.md](docs/workflow/task-owner-guide.md) | Implementation / development subagents |
| Reviewer | [reviewer-guide.md](docs/workflow/reviewer-guide.md) | Reviewer subagents |

The orchestrator reads all guides. Each subagent reads only `subagent-contract.md` + its own role guide.

## Workflow Directory

Each requirement gets its own workflow directory that contains the durable coordination documents used by the orchestrator and subagents.

This directory is intentionally separate from the product code so planning, checkpoints, evidence, and archive operations do not affect the repository structure or implementation layout.

Recommended layout:

```text
workflow/
  requirements/
    <requirement-id>/
      GOAL.md
      PLAN.md
      STATUS.md
      DECISIONS.md
      CONTEXT.md
      TASKS/
        T-001.md
        T-002.md
      EVIDENCE/
        T-001-test.txt
        T-002-review.txt
      RUNS/
        T-001-run-01.json
        T-002-run-01.json
      ARCHIVE/
```

### Directory Responsibilities

- `GOAL.md` — target state, non-goals, acceptance definition
- `PLAN.md` — task breakdown, dependency order, parallelism decisions, phase boundaries
- `STATUS.md` — orchestrator-maintained task board, top-level objective, completed work, remaining work, current critical path, next dispatch queue, current phase, active blockers
- `DECISIONS.md` — committed decisions and rationale (including finalized decisions from discovery proposals)
- `CONTEXT.md` — stable requirement context that multiple subagents need: terminology, links, constraints, known assumptions
- `TASKS/T-xxx.md` — one task brief per executable task
- `EVIDENCE/` — logs, command output, screenshots, notes, and other proof
- `RUNS/` — structured handoff packets and checkpoints
- `ARCHIVE/` — optional holding area for closed or superseded artifacts

## Model and Reasoning Policy

Keep the model policy simple and biased toward stronger execution quality.

- Discovery, explorer, and planning subagents should use stronger models with higher reasoning by default.
- Task owner, reviewer, and verifier subagents should use capable models with standard reasoning by default.
- Weaker models should not be the default for substantive work.
- If a narrower or cheaper model is considered for a task, the orchestrator should make that decision explicitly and only for low-risk, tightly bounded work.
- If the user, the requirement plan, or the task brief specifies model requirements, that specification overrides any cost, speed, or agent-availability heuristic.

## Minimal Operating Rule Set

Use this mode when the work needs strict sequencing, delegated execution, and explicit handoffs:

- one main agent acts as the orchestrator
- one explicit top-level objective stays active until complete or concretely blocked
- the orchestrator owns the requirement workflow directory
- if the requirement is large or unclear, start with a dedicated discovery or planning subagent
- all substantive task work is delegated to subagents
- each execution task uses a fresh subagent
- long-running subagents are allowed and should not be closed early just for being slow
- active subagents are polled sparingly; checkpoints are progress signals, not takeover triggers
- the orchestrator owns global plan mutation
- task-level `BLOCKED` and `NEEDS_REPLAN` come from the subagent; stale-run recovery belongs to the orchestrator
- task-local analysis and implementation usually stay together unless there is a strong reason to split them
- review and independent verification are dispatched when risk justifies them
- every task returns a structured handoff packet
- after each terminal handoff packet, the orchestrator dispatches the next ready task, dispatches verification, or records a concrete blocker
- milestone completion or partial green verification is not a valid stop condition while required work remains
- checkpoint-only or retry-heavy runs trigger re-scope, re-dispatch, defer, or escalation, not orchestrator rescue implementation
- final completion requires an explicit acceptance step
- workflow artifacts may be archived or reorganized without affecting product code
- subagents that produce durable output write it directly to the workflow directory and return file paths to the orchestrator
- the orchestrator does not rewrite or transcribe subagent output into separate documents
- the orchestrator assembles context for downstream subagents by referencing file paths, not by duplicating content
- review of discovery output is risk-based: the orchestrator decides whether a reviewer is needed based on the risk and novelty of the output
- proposals with open decision points must be driven to committed decisions before implementation tasks are dispatched
