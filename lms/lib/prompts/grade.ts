import type { Assignment, Gap, Submission } from "@/lib/supabase/types";

const JSON_CONTRACT = `Return ONLY a single fenced \`\`\`json block matching:
{
  "letter_grade": "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F",
  "numeric_grade": <int 0-100>,
  "rubric_breakdown": { "<criterion>": { "score": <int>, "max": <int>, "comment": "..." }, ... },
  "feedback_md": "<concrete, actionable, specific>",
  "strengths_md": "<what was done well>",
  "improvements_md": "<what to fix this week>",
  "identified_gaps": [ { "topic": "<short>", "description": "<one sentence>", "category": "<concept | code | writing | math>" } ]
}`;

function context(args: {
  assignment: Assignment;
  submission: Submission;
  priorGaps: Pick<Gap, "topic" | "description">[];
}) {
  return `### Assignment
Title: ${args.assignment.title}
Kind: ${args.assignment.kind}
Prompt:
${args.assignment.prompt_md ?? "(none)"}

### Rubric
${args.assignment.rubric_md ?? "(use the standard rubric for this kind)"}

### Prior unresolved gaps (use these to weight feedback when relevant)
${
  args.priorGaps.length === 0
    ? "(none)"
    : args.priorGaps.map((g) => `- ${g.topic}: ${g.description}`).join("\n")
}

### Submission metadata
attempt_number: ${args.submission.attempt_number}
is_late: ${args.submission.is_late}
hours_late: ${args.submission.hours_late ?? 0}
language: ${args.submission.language ?? "n/a"}
github_url: ${args.submission.github_url ?? "n/a"}
`;
}

export function gradeWeeklyReportPrompt(args: {
  assignment: Assignment;
  submission: Submission;
  priorGaps: Pick<Gap, "topic" | "description">[];
}) {
  return `You are grading a weekly report. Apply the rubric strictly.

${context(args)}

### Student submission
${args.submission.content_md ?? "(empty)"}

${JSON_CONTRACT}`;
}

export function gradeDiscussionPostPrompt(args: {
  assignment: Assignment;
  submission: Submission;
  priorGaps: Pick<Gap, "topic" | "description">[];
}) {
  return `You are grading a discussion post. Focus on: clarity, technical accuracy, depth of synthesis, connections to prior material, technical writing quality.

${context(args)}

### Student submission
${args.submission.content_md ?? "(empty)"}

${JSON_CONTRACT}`;
}

export function gradeTutorialCompletionPrompt(args: {
  assignment: Assignment;
  submission: Submission;
  priorGaps: Pick<Gap, "topic" | "description">[];
}) {
  return `You are grading the tutorial-completion answers (the conceptual questions answered cold from memory after both tutorials). Penalize answers that look like rereading rather than recall.

${context(args)}

### Student answers
${args.submission.content_md ?? "(empty)"}

${JSON_CONTRACT}`;
}

export function gradeMiniProblemPrompt(args: {
  assignment: Assignment;
  submission: Submission;
  priorGaps: Pick<Gap, "topic" | "description">[];
}) {
  return `You are grading the mini problem set (conceptual + small code problems). Grade for correctness, code quality, edge case handling.

${context(args)}

### Student code / answers
\`\`\`${args.submission.language ?? ""}
${args.submission.code ?? args.submission.content_md ?? "(empty)"}
\`\`\`

${JSON_CONTRACT}`;
}

export function gradeMainProjectPrompt(args: {
  assignment: Assignment;
  submission: Submission;
  priorGaps: Pick<Gap, "topic" | "description">[];
}) {
  return `You are a senior embedded engineer reviewing this project as if it were a take-home for a SpaceX/Anduril/Apple/NVIDIA firmware role. Grade against rubric: correctness, design, edge cases, performance, defensive coding, code quality.

${context(args)}

### Code
\`\`\`${args.submission.language ?? ""}
${args.submission.code ?? "(no code)"}
\`\`\`

### Written portion (if present)
${args.submission.content_md ?? "(none)"}

${JSON_CONTRACT}`;
}

export function gradeExamPrompt(args: {
  assignment: Assignment;
  submission: Submission;
  priorGaps: Pick<Gap, "topic" | "description">[];
}) {
  return `You are grading an exam. The exam structure (questions + per-question rubric) is in the assignment prompt. The student's answers are below — they are formatted as a JSON array of { questionId, answer_md }. Grade each question against its rubric, aggregate, and produce the final grade.

${context(args)}

### Student answers (JSON)
\`\`\`json
${args.submission.content_md ?? "[]"}
\`\`\`

In rubric_breakdown, key by questionId. Topics where the student struggled most should populate identified_gaps so they can be tracked through the rest of the phase.

${JSON_CONTRACT}`;
}

export function gradeKinesisReportPrompt(args: {
  assignment: Assignment;
  submission: Submission;
  priorGaps: Pick<Gap, "topic" | "description">[];
}) {
  return `You are grading a KINESIS milestone written report. The student is documenting a real engineering deliverable that will eventually be reviewed by an outside hiring committee. Hold the bar accordingly.

${context(args)}

### Report
${args.submission.content_md ?? "(empty)"}

${JSON_CONTRACT}`;
}

export function gradeKinesisProjectPrompt(args: {
  assignment: Assignment;
  submission: Submission;
  priorGaps: Pick<Gap, "topic" | "description">[];
}) {
  return `You are grading a KINESIS milestone code/firmware deliverable. Apply senior-engineer review standards: architecture, correctness, hardware awareness, defensive coding, testing, documentation.

${context(args)}

### Code
\`\`\`${args.submission.language ?? ""}
${args.submission.code ?? "(no code)"}
\`\`\`

### Notes / report
${args.submission.content_md ?? "(none)"}

${JSON_CONTRACT}`;
}

export function gradeProjectOutPrompt(args: {
  assignment: Assignment;
  submission: Submission;
  priorGaps: Pick<Gap, "topic" | "description">[];
}) {
  return `This is a project-out capstone. Pass threshold is A (93%+). Anything below is a fail. The student MUST demonstrate mastery of every gap topic listed in the assignment. Do not pass if any gap topic is half-addressed.

${context(args)}

### Code
\`\`\`${args.submission.language ?? ""}
${args.submission.code ?? "(no code)"}
\`\`\`

### Report
${args.submission.content_md ?? "(none)"}

${JSON_CONTRACT}`;
}

export function evaluateRebuttalPrompt(args: {
  assignment: Assignment;
  submission: Submission;
  originalGrade: {
    numeric_grade: number;
    letter_grade: string;
    rubric_breakdown: Record<string, unknown> | null;
    feedback_md: string;
  };
  argumentMd: string;
}) {
  return `Re-evaluate the student's work in light of their argument. Was the original grade fair? Did they raise legitimate points the original grader missed?

### Assignment
${args.assignment.title}
${args.assignment.prompt_md ?? ""}

### Rubric
${args.assignment.rubric_md ?? "(none)"}

### Original submission
${args.submission.content_md ?? args.submission.code ?? "(empty)"}

### Original grade
Letter: ${args.originalGrade.letter_grade}
Numeric: ${args.originalGrade.numeric_grade}
Rubric breakdown: ${JSON.stringify(args.originalGrade.rubric_breakdown ?? {}, null, 2)}
Feedback:
${args.originalGrade.feedback_md}

### Student's argument
${args.argumentMd}

Decide:
- "upheld" — argument did not change the grade
- "partially_revised" — some criterion is adjusted; new grade differs from original by 1-4 points
- "fully_revised" — argument is correct; significant grade change

Return JSON:
\`\`\`json
{
  "outcome": "upheld" | "partially_revised" | "fully_revised",
  "ai_response_md": "<your reasoning, addressed to the student>",
  "revised_grade": null OR {
    "letter_grade": "...",
    "numeric_grade": <int>,
    "rubric_breakdown": {...},
    "feedback_md": "...",
    "strengths_md": "...",
    "improvements_md": "...",
    "identified_gaps": []
  }
}
\`\`\``;
}
