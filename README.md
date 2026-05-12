# embedded-systems-roadmap

A self-directed, mastery-first engineering curriculum built toward firmware architecture and hardware/software boundary engineering at companies like SpaceX, Anduril, Apple, NVIDIA, and Second Order Effects.

---

## What this is

This repo is the public record of a structured 3–5 year self-directed transition from embedded systems engineering at Boeing into firmware architecture — specifically BSP design, HAL abstraction, RTOS integration, bootloader architecture, and driver frameworks.

Every week produces a reading, a tutorial, a project, and a written report. Everything is committed here. The commit history is the portfolio.

---

## Why this exists

Most engineers talk about career growth. This repo is the evidence of it happening.

The curriculum is built around one principle: mastery before movement. Nothing advances until the concept is proven through building. Not through reading about it. Not through watching a video. Through writing code, breaking it, debugging it, and explaining why it works.

---

## Target roles

Firmware Engineer — Hardware/Software Architecture
Companies: SpaceX, Anduril, Apple, NVIDIA, Second Order Effects
Timeline: 3–5 years

---

## Curriculum structure

Four phases, sequential. Nothing advances until the current phase is proven.

| Phase | Topic | Primary texts |
|---|---|---|
| 1 | C — systems programming fundamentals | The C Programming Language (K&R), Grokking Algorithms |
| 2 | C++ — transition from C with full language depth | Accelerated C++, C++ Primer, Effective Modern C++ (Meyers), Programming: Principles and Practice (Stroustrup) |
| 3 | OS Concepts and Linux internals | Operating System Concepts (Silberschatz), Linux Device Drivers, Mastering Embedded Linux Programming |
| 4 | Embedded systems — bare metal to RTOS | Embedded C + AVR, MicroC/OS-II, ARM Cortex-M3 and Cortex-M4 (Yiu) |

---

## Weekly cadence

Every weekend follows the same structure without exception.

| Block | Time | Purpose |
|---|---|---|
| Problem opens | Saturday 5:00 AM | Privacy screen lifts, PROBLEM.md becomes visible |
| Reading | Saturday 7–10 AM | K&R topic + Linux concept + DSA concept |
| Build start | Saturday 5–9 PM | Tutorial + Tier 1–3 problems start |
| Build finish | Sunday 6:30–8:30 AM | Tier 4 push, Tier 5 Mastery Confirmed gate |
| Report | Sunday 4:30–6 PM | Written report + GitHub commit |

The full submission window for the week's five tiers runs seven days from Saturday 5:00 AM Pacific. Before that opening time, the privacy screen is the only visible artifact: it lists the data structures and algorithms threading into the week (grouped by topic type, in lead-in order) and the phase-cumulative DSA ladder, so reading is primed without leaking the problems. There are no midterms, finals, or umbrella exams — mastery is proven weekly through Tier 5.

---

## Weekly deliverables

Every week produces four committed artifacts:

**READING.md** — defines the week's C concept, Linux topic, and data structure or algorithm. Active reading notes and comprehension checkpoints.

**TUTORIAL.md** — a hands-on walkthrough of the week's tooling or concept. Step by step. Every command exact. Every failure case explained.

**PROBLEM.md** — a real-world engineering problem set styled after SpaceX, Anduril, Apple, NVIDIA, and Second Order Effects interview problems. Incorporates C, Linux, and DSA concepts together. Verified solvable before assigned. Ships as five tiers on the same topic — Beginning, Middle, Hard, Mastery, and Mastery Confirmed — and Tier 5 is the gate that proves the week is internalized. PROBLEM.md is sealed behind a privacy screen until Saturday 5:00 AM Pacific opening time; the submission window is seven days from opening.

**weekly-reports/week_#_Topic.md** — written report covering what was built, the core design decision, what broke and how it was fixed, concepts explained cold from memory, and answers to interview-style questions on time complexity, system design, and real-world application.

---

## Repo structure

```
embedded-systems-roadmap/
  phase1-c/
    week_1_Variables_and_Memory/
    week_2_Types_and_Operators/
    week_3_Control_Flow/
    ...
  phase2-cpp/
  phase3-os/
  phase4-embedded/
  weekly-reports/
    week_1_Variables_and_Memory.md
    week_2_Types_and_Operators.md
    ...
```

---

## Hardware

Problems are grounded in real hardware as the curriculum advances.

| Phase | Hardware in use |
|---|---|
| 1–2 | MacBook Pro M4, Ubuntu ARM via Parallels |
| 3 | Raspberry Pi, Odroid N2 |
| 4 | STM32 Nucleo, ESP32-S3, ST B-L475E-IOT01A1, Flipper Zero |

Full inventory: Flipper Zero, MacBook Pro M4, Protectli Vault VP2420, STM32 Nucleo (onboard ST-Link), second STM32, MSP-EXP430, Arduino Mega 2560, Arduino MKR WiFi 1010, Adafruit 2.8" TFT LCD shield, Adafruit Music Maker shield, ESP32-S3, ST B-L475E-IOT01A1, Odroid N2, Raspberry Pi, Basys 3 FPGA.

---

## Standards

- Every solution is written in C through Phase 1, C++ through Phase 2
- Code is committed with descriptive messages — the commit history is readable
- Weekly reports are written from memory — no referencing the solution while writing
- Problems include interview-style questions answered in writing every week: time complexity, scale behavior, design tradeoffs, real-systems connection, and defense of design decisions in an AI-assisted engineering environment
- Linux is incorporated into every project where it adds real learning value via Ubuntu ARM on Parallels
- PROBLEM.md is embargoed behind a privacy screen until Saturday 5:00 AM Pacific opening time; the five tiers are not visible — and not requested — before then
- Mastery is verified weekly through the Tier 5 Mastery Confirmed gate. There are no midterms, finals, or umbrella exams in this curriculum; if one is ever accidentally produced it is removed and replaced with the weekly tier structure

---

## Current status

**Phase 1 — C Fundamentals**
Week 1 begins May 2, 2026.

---

## Background

Boeing embedded systems engineer. Experience in security protocols and secure systems. Transitioning into firmware architecture at the hardware/software boundary.

This repo is the work. Come back in a year and read the commit history.

---

## A note on AI

This README and the curriculum prompt that drives the weekly problem and tutorial delivery were created with the assistance of Claude (Anthropic). The project schedule, weekly deliverables, and problem structure are managed through a Claude project acting as a senior engineer execution agent.

Beyond that — no AI assistance is permitted.

The weekly problems, solutions, reports, and interview question answers are written entirely by hand. The constraints in the curriculum prompt are strict by design: solutions must be defended cold, concepts must be explained from memory, and code must be understood at the level of first principles before anything advances. If you read the weekly reports and the commit history, you will see the work. That is the point.
