import type { AssignmentKind } from "@/lib/supabase/types";

const WEEKLY_REPORT = `### Weekly Report Rubric

- **Synthesis (25 pts)** — Did the student connect the week's reading, tutorial, and project into a coherent narrative? A: integrative, original framing. B+: solid summary with some connection. B-: surface-level recap. <C: list of unrelated facts.
- **Cold-recall accuracy (25 pts)** — Were the from-memory questions answered without lookups, and were the answers correct? A: precise terminology, full diagrams. B+: small omissions. <C: re-reading evident.
- **Code review of the week's project (20 pts)** — Was the design defended in writing? Were tradeoffs named?
- **Gap identification (15 pts)** — Did the student name what they don't yet understand?
- **Technical writing quality (15 pts)** — Clarity, structure, no padding.

A (93-100): Comprehensive synthesis. Cold-recall demonstrates mastery. Gaps clearly identified. Code review shows deep understanding.
A- (90-92): Strong synthesis with minor omissions.
B+ (87-89): Solid understanding, weak spots in specific evaluation questions.
B (83-86): Competent but surface-level on some questions.
B- (80-82): Basic competence, multiple notable gaps.
C+ (77-79): Below standard.
C (73-76): Significant gaps.
C- (70-72): Marginal.
D (60-69): Failing.
F (<60): Failed.`;

const DISCUSSION_POST = `### Discussion Post Rubric

- **Clarity (25 pts)** — Argument is easy to follow and well-structured.
- **Technical accuracy (30 pts)** — No factual errors; precise terminology.
- **Depth of synthesis (25 pts)** — Goes beyond restatement; ties the week's reading to a real engineering scenario or to prior weeks.
- **Connections (10 pts)** — Names specific prior topics or readings.
- **Writing quality (10 pts)** — Concise, no padding.

300-600 words expected. Anything under 200 words capped at B-.`;

const TUTORIAL_COMPLETION = `### Tutorial Completion Rubric

Each tutorial's conceptual questions answered cold from memory.

- **Recall accuracy (60 pts)** — Did the student get the technical answer right without lookups?
- **Mechanism explanation (25 pts)** — Did they explain WHY, not just WHAT?
- **Code references (15 pts)** — When citing tutorial code, did they reproduce signatures and behavior accurately?

A: every question answered correctly with mechanism. B+: minor errors in 1-2 questions. C+: re-reading evident in answers. F: blank or copy-pasted.`;

const MINI_PROBLEM = `### Mini Problem Rubric

- **Conceptual answers (40 pts)** — Correctness of the conceptual sub-questions.
- **Code correctness (35 pts)** — Programs compile, run, and produce correct output for the stated inputs.
- **Edge cases (15 pts)** — Boundary conditions handled.
- **Code quality (10 pts)** — Idiomatic, readable.`;

const MAIN_PROJECT = `### Main Project Rubric (interview-grade)

- **Correctness (30 pts)** — Solves the stated problem under the given inputs and constraints.
- **Design (20 pts)** — Architecture choice is appropriate; tradeoffs are explicit.
- **Edge cases (15 pts)** — Failure modes accounted for.
- **Performance (10 pts)** — Meets stated constraints; bottlenecks identified.
- **Defensive coding (10 pts)** — Inputs validated, errors handled, undefined behavior avoided.
- **Code quality (10 pts)** — Readable, idiomatic, structurally sound.
- **Evaluation answers (5 pts)** — The 7+ end-of-project questions answered in writing.

A (93+): senior-engineer-quality. A- (90-92): one or two minor issues. B+ (87-89): correct but with named weaknesses. B (83-86): correct but blunt. B- (80-82): partially correct. <C: incomplete.`;

const MID_PHASE_EXAM = `### Mid-Phase Exam Rubric

Each question carries its own per-question rubric (in the assignment prompt). Aggregate is the sum of per-question scores normalized to 100. **Mastery gate exams require ≥85% to pass.** Below 85% triggers exam-prep + retake.`;

const END_PHASE_EXAM = `### End-of-Phase Exam Rubric

Identical to mid-phase exam grading. End-of-phase exam is part of the mastery gate: phase does NOT transition until ≥85%, all weekly assignments graded, KINESIS milestone complete, and all gaps resolved (or project-out passed).`;

const KINESIS_REPORT = `### KINESIS Report Rubric

- **Engineering reasoning (35 pts)** — Tradeoffs named, alternatives considered, decisions defended.
- **Completeness (25 pts)** — Every completion criterion addressed.
- **Documentation quality (20 pts)** — Diagrams, schematics, measurements where relevant.
- **Test evidence (15 pts)** — Concrete results, not assertions.
- **Writing quality (5 pts)**`;

const KINESIS_PROJECT = `### KINESIS Project (Code/Firmware) Rubric

- **Architecture (25 pts)** — Layering is sound; no leaky abstractions.
- **Correctness (25 pts)** — Functional under stated tests.
- **Hardware awareness (15 pts)** — Resource constraints respected; ISR safety; timing.
- **Testing (15 pts)** — Unit + integration tests present and passing.
- **Defensive coding (10 pts)** — Failure modes handled.
- **Documentation (10 pts)** — README, comments where they earn their place.`;

const PROJECT_OUT = `### Project-Out Capstone Rubric

**Pass threshold: A (93%+).** Anything below fails. Failure triggers per-topic remediation assignments before retry.

- **Coverage (40 pts)** — Every gap topic from the gap tracker is exercised in the deliverable.
- **Mastery (40 pts)** — Each gap topic is demonstrated at A-level mastery, not partial.
- **Engineering quality (15 pts)** — Code and documentation hold up to senior-engineer review.
- **Written defense (5 pts)** — Tradeoffs and decisions defended in writing.`;

const REMEDIATION = `### Remediation Rubric

- **Mastery of single topic (80 pts)** — A-level mastery of the targeted gap topic. Anything less than A blocks project-out retry on this topic.
- **Code quality (10 pts)**
- **Written explanation (10 pts)**`;

export const rubricFor: Record<AssignmentKind, string> = {
  weekly_report: WEEKLY_REPORT,
  discussion_post: DISCUSSION_POST,
  tutorial_completion: TUTORIAL_COMPLETION,
  mini_problem: MINI_PROBLEM,
  main_project: MAIN_PROJECT,
  mid_phase_exam: MID_PHASE_EXAM,
  end_phase_exam: END_PHASE_EXAM,
  kinesis_report: KINESIS_REPORT,
  kinesis_project: KINESIS_PROJECT,
  project_out: PROJECT_OUT,
  remediation: REMEDIATION,
};
