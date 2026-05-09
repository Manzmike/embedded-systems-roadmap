import type { Gap, Phase, Week } from "@/lib/supabase/types";

interface PriorWeek {
  week_number: number;
  topic: string;
}

export function generateReadingPrompt(args: {
  phase: Phase;
  week: Week;
  priorWeeks: PriorWeek[];
}) {
  const priorList =
    args.priorWeeks.length === 0
      ? "(this is week 1)"
      : args.priorWeeks
          .map((w) => `- Week ${w.week_number}: ${w.topic}`)
          .join("\n");

  return `Generate the READING.md for week ${args.week.week_number} of ${args.phase.name}.

Topic: ${args.week.topic}.

Phase context:
${args.phase.description ?? ""}

Prior weeks completed:
${priorList}

Output a single markdown document with these sections in order:
1. # Week ${args.week.week_number}: ${args.week.topic}
2. ## Reading schedule — four sections (Mon, Tue, Thu, Fri), each one ~60 min, with exact book + chapter + page ranges. Pull from the phase's primary texts (e.g. Phase 1: K&R, Linux in a Nutshell, Grokking Algorithms; Phase 2: Accelerated C++, Stroustrup PPP, Effective Modern C++; Phase 3: Silberschatz, Linux Device Drivers, Mastering Embedded Linux; Phase 4: Embedded C/AVR, MicroC/OS-II, Yiu Cortex-M).
3. ## Active reading prompts — 6-10 numbered questions to answer in the margin while reading.
4. ## Restate-from-memory checkpoint — 4-6 prompts the student answers AFTER reading, with the book closed.
5. ## Drawings to make from memory — 2-4 specific diagrams to sketch (e.g. memory layout, syscall flow, pointer diagram).
6. ## Connections to prior weeks — how this topic builds on what they've already learned.

Use clean GitHub-flavored markdown. Keep technical density high. Do not pad.`;
}

export function generateTutorialAndProblemPrompt(args: {
  phase: Phase;
  week: Week;
  priorWeeks: PriorWeek[];
  priorGaps: Pick<Gap, "topic" | "description">[];
}) {
  const gapList =
    args.priorGaps.length === 0
      ? "(no unresolved gaps yet)"
      : args.priorGaps.map((g) => `- ${g.topic}: ${g.description}`).join("\n");

  return `Generate the TUTORIAL.md, PROBLEM.md, and NOTEBOOKLM.md for week ${args.week.week_number} of ${args.phase.name}.

Topic: ${args.week.topic}.

Unresolved gaps from prior weeks (reinforce these, do not skip):
${gapList}

Format your output EXACTLY like this, with the three delimiters on their own lines:

<<<TUTORIAL>>>
# Tutorials — Week ${args.week.week_number}: ${args.week.topic}

Two deep tutorials. Each ~75-90 minutes. For each tutorial:
- ## Tutorial N: <title>
- Why this matters (3-5 sentences)
- Step-by-step instructions with exact commands, expected output, and explanations of failure modes
- ### Conceptual questions (5-8 numbered) the student answers from memory after the tutorial. No answer key.

<<<PROBLEM>>>
# Problem set — Week ${args.week.week_number}: ${args.week.topic}

## Mini work (40% of build time, ~3 hours total)
- 4-6 conceptual questions (cold-recall, no looking things up)
- 3-4 mini code problems, 15-30 minutes each, with input/output specs and edge cases listed

## Main project (60% of build time, ~5 hours total)
A SpaceX/Anduril/Apple/NVIDIA-style problem grounded in real engineering. Title it. State the problem in 2-3 paragraphs. Include:
- Required functions / components with exact signatures
- Input/output contract
- Constraints (memory, performance, safety)
- 5-question fault isolation: what does the student check first if it doesn't run?
- 7+ evaluation questions answered in writing once the project is done (time complexity, scale behavior, design tradeoffs, real-system connection, defense of design decisions)

<<<NOTEBOOKLM>>>
# NotebookLM seed — Week ${args.week.week_number}: ${args.week.topic}

Bullet list of 12-20 prompts the student can paste into NotebookLM with the week's primary texts loaded. Each prompt should target a specific concept or comparison and produce a study artifact (table, diagram, summary).
`;
}

export function generateSyllabusPrompt(phase: Phase) {
  return `Write a complete syllabus for ${phase.name} of the embedded systems engineering self-study program.

Phase description: ${phase.description ?? ""}
Planned start: ${phase.planned_start}
Planned end: ${phase.planned_end}

Sections, in order:
1. # ${phase.name}
2. ## Learning objectives — 6-10 specific outcomes
3. ## Reading list — every book with all chapters covered in this phase, formatted as a markdown table (book | chapters | weeks)
4. ## Assignment schedule — week-by-week table (week | topic | deliverables)
5. ## Grading breakdown — percentage weight per assignment kind (weekly_report, discussion_post, tutorial_completion, mini_problem, main_project, mid_phase_exam, end_phase_exam, kinesis)
6. ## Late policy — verbatim:
   - 0-24 hours late: -10%
   - 24-48 hours late: -20%
   - 48-72 hours late: -30%
   - >72 hours: missed (gap auto-created, 0 grade)
7. ## Mastery gate — exam ≥85%, all weekly assignments graded, KINESIS milestone for this phase complete; if gaps remain, project-out capstone at A (93%+) threshold.
8. ## Academic integrity — single-student program; AI assistance is permitted ONLY in the form of this LMS as the professor/grader; reading, problem solving, and reports are written from memory.
9. ## Office hours — instruct the student to use Claude.ai chat for free-form questions outside this LMS.

Tone: rigorous but supportive. Direct. No padding.`;
}

export function generateExamPrepGuidePrompt(args: {
  phase: Phase;
  weeksCovered: PriorWeek[];
  isEndPhase: boolean;
}) {
  const range = `${args.weeksCovered[0]?.week_number ?? "?"}-${args.weeksCovered.at(-1)?.week_number ?? "?"}`;
  return `Generate a study guide covering weeks ${range} of ${args.phase.name} for ${args.isEndPhase ? "an end-of-phase exam" : "a mid-phase exam"}.

Weeks covered:
${args.weeksCovered.map((w) => `- Week ${w.week_number}: ${w.topic}`).join("\n")}

Sections:
1. # Study guide — ${args.phase.name}, ${args.isEndPhase ? "end-of-phase" : "mid-phase"} exam
2. ## Topic outline — every topic and sub-topic, hierarchical
3. ## Recommended review order — 3-5 day plan
4. ## Key concepts to master — bulleted, each with 1 sentence on why it matters
5. ## Common pitfalls — specific mistakes students make on this material
6. ## Practice questions — ${args.isEndPhase ? "15" : "10"} ungraded questions with answer keys; mix short answer, code analysis, debugging, design.

Clean markdown. Direct.`;
}

export function generateExamPrompt(args: {
  phase: Phase;
  weeksCovered: PriorWeek[];
  isEndPhase: boolean;
}) {
  const dur = args.isEndPhase ? "90-120 minutes" : "45-60 minutes";
  const qCount = args.isEndPhase ? "20-25" : "15-20";
  return `Generate a ${dur} ${args.isEndPhase ? "end-of-phase" : "mid-phase"} exam for ${args.phase.name}, covering:
${args.weeksCovered.map((w) => `- Week ${w.week_number}: ${w.topic}`).join("\n")}

Format your output as JSON:
\`\`\`json
{
  "duration_minutes": <number>,
  "questions": [
    {
      "id": "Q1",
      "type": "short_answer" | "code_analysis" | "debugging" | "design",
      "prompt_md": "...",
      "max_points": <number>,
      "rubric_md": "..."
    }
  ],
  "total_points": <number>
}
\`\`\`

${args.isEndPhase ? "Lean on integrative questions that require synthesis across multiple topics." : "Mix difficulty; calibrate so a B+ is the median for a solid student."}`;
}

export function generateProjectOutPrompt(args: {
  phase: Phase;
  gapTopics: { topic: string; description: string }[];
}) {
  return `Generate a capstone "project-out" assignment that exercises ALL of the following unresolved gap topics for ${args.phase.name}:

${args.gapTopics.map((g) => `- ${g.topic}: ${g.description}`).join("\n")}

Pass threshold: A (93%+).

Output a complete assignment in markdown:
1. # Project-Out Capstone
2. ## Problem context (2-3 paragraphs of real engineering scenario)
3. ## Required components — every gap topic above MUST be exercised; map each to a section of the deliverable
4. ## Constraints — memory, latency, correctness, safety
5. ## Deliverables — code (single language consistent with the phase) + written report
6. ## Evaluation rubric — explicit per-component scoring; 93%+ = pass`;
}

export function generateRemediationPrompt(args: {
  failedTopics: { topic: string; description: string }[];
}) {
  return `Generate one focused remediation assignment per topic below. Each must be completable in 3-5 hours and target ONLY that topic.

Topics:
${args.failedTopics.map((g) => `- ${g.topic}: ${g.description}`).join("\n")}

Output JSON:
\`\`\`json
{
  "assignments": [
    {
      "topic": "...",
      "title": "...",
      "prompt_md": "...",
      "rubric_md": "...",
      "estimated_hours": <number>
    }
  ]
}
\`\`\``;
}
