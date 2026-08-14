# AI Research OS
## Personal Research Operating System

**Document Version:** v1.0  
**Development Scope:** P0 + P1  
**P2:** Out of Scope / Do Not Implement  
**Target Platform:** macOS + Safari / Local Web App  
**Primary User:** Individual researcher  
**Research Domain:** Biology  
**Primary Research Interests:** Liquid-Liquid Phase Separation (LLPS), aberrant condensates in neurodevelopment, programmable condensates, and AI protein design

---

# 1. Project Positioning

## 1.1 Product Name

**AI Research OS**

Subtitle:

**Personal Research Operating System**

## 1.2 Core Positioning

AI Research OS is not intended to be another generic:

- note-taking application
- project management application
- literature manager
- PDF reader
- AI chatbot
- calendar application

Instead, it is a:

> **Lightweight personal AI research workspace that integrates learning, research, knowledge management, experiment records, writing, and leisure, while connecting existing professional tools through AI-assisted orchestration.**

Core principle:

> **AI Research OS should organize, connect, orchestrate, and intelligently assist workflows rather than reinvent mature tools.**

---

# 2. Core Design Principles

## 2.1 Do Not Reinvent Mature Tools

Prefer integrating existing tools instead of rebuilding them.

| Capability | Preferred Tool |
|---|---|
| Broad literature discovery | Google Scholar |
| Biomedical literature search | PubMed / Europe PMC |
| Citation / paper discovery | Semantic Scholar |
| Literature management | Zotero |
| PDF reading and annotation | Xiaolvjing |
| Long-term knowledge management | Obsidian |
| Version control | Git / GitHub |
| UI runtime | Local Web App / Safari |
| AI layer | DeepSeek, with future model extensibility |

AI Research OS acts as the orchestration layer connecting these systems.

---

# 3. Overall Information Architecture

The application consists of three primary spaces plus a central command center:

```text
AI Research OS

├── Dashboard / Command Center
├── Learning
├── Research
└── Leisure
```

The three spaces should remain logically distinct.

### Learning

Answers:

> What should I learn, how far have I progressed, and how does this knowledge connect to my research?

### Research

Answers:

> What am I researching, what questions am I investigating, what experiments am I running, and what should I do next?

### Leisure

Answers:

> What do I do outside of research?

### Dashboard / Command Center

Answers:

> What should I do today and what is currently important?

---

# 4. Dashboard / Command Center

The Dashboard is the default entry point.

The user should understand the following within approximately 10 seconds:

- what needs to be done today
- current learning progress
- current research progress
- active projects
- recent activity
- current focus session

## 4.1 Today

Display:

- today's tasks
- learning tasks
- research tasks
- experiment tasks
- calendar
- focus sessions

Example:

```text
TODAY

□ Read 2 papers
□ Finish LLPS lecture
□ Analyze Experiment #12
□ Write discussion
```

## 4.2 Research Overview

Display:

- active projects
- papers read this week
- experiments
- open research questions
- active hypotheses
- recent research activity

## 4.3 Learning Overview

Display:

- today's learning tasks
- study streak
- weekly study time
- current learning roadmap
- knowledge progress
- recent learning notes

## 4.4 Quick Actions

Provide quick actions such as:

- New Task
- New Note
- New Experiment
- New Research Question
- Add Paper
- Add Inbox Item
- Start Focus Mode

---

# 5. Learning Space

The Learning space should help the user plan, execute, review, and connect learning activities with research.

## 5.1 Learning Dashboard

Include:

- Today's Learning
- Calendar
- Learning Roadmap
- Knowledge Progress
- Study Streak
- Recent Notes
- Weak Areas

## 5.2 Learning Planning

Support:

- long-term goals
- monthly goals
- weekly plans
- daily plans
- time-based study tasks

Hierarchy:

```text
Goal
↓
Month
↓
Week
↓
Day
↓
Task
```

## 5.3 Learning Calendar

Support:

- month view
- week view
- day view
- time blocks
- learning tasks
- research tasks
- focus sessions
- drag-and-drop rescheduling where practical

## 5.4 Daily Check-in

A study session can record:

- completion status
- study duration
- topic
- notes
- reflections
- key takeaways

Example:

```text
Study Session

Topic:
Polymer Physics

Duration:
52 min

Status:
Completed

Notes:
...
```

## 5.5 Learning Roadmap

Allow hierarchical learning paths.

Example:

```text
LLPS

├── Physical Principles
│   ├── Thermodynamics
│   ├── Phase Diagrams
│   └── Polymer Physics
│
├── Molecular Mechanisms
│   ├── IDRs
│   ├── Multivalency
│   └── PTMs
│
├── Experimental Methods
│   ├── FRAP
│   ├── Microscopy
│   └── Turbidity
│
└── Disease Mechanisms
    └── Neurodevelopment
```

Knowledge status:

```text
Not Started
Learning
Practiced
Understood
Mastered
```

## 5.6 Learning ↔ Research Connections

A learning concept should be linkable to:

- papers
- research projects
- experiments
- notes
- research questions

Example:

```text
FRAP

├── Learning Notes
├── Related Papers
├── Experiment #12
└── Project: Aberrant Condensates
```

The goal is to answer:

> Where is the knowledge I learned actually being used in my research?

## 5.7 AI Learning Assistant

Support:

- explain concept
- simplify explanation
- deep explanation
- examples
- quizzes
- flashcards
- knowledge-gap detection
- review previous knowledge

The AI should be context-aware and able to access the current learning topic and related notes.

---

# 6. Research Space

Research is the core of the application.

Primary structure:

```text
Research

├── Projects
├── Literature
├── Research Questions
├── Hypotheses
├── Experiments
├── Data
├── Notes
├── Writing
└── Timeline
```

---

# 7. Projects

Projects are the main organizational layer of research.

Example:

```text
Research

Project 01
Aberrant Condensates in Neurodevelopment

Project 02
Programmable Condensates

Project 03
AI Protein Design
```

## 7.1 Project Page

Each project should contain:

```text
Project

├── Overview
├── Research Questions
├── Hypotheses
├── Literature
├── Experiments
├── Data
├── Notes
├── Figures
├── Writing
├── Tasks
└── Timeline
```

---

# 8. Research Questions

Research Questions should be first-class objects rather than ordinary notes.

Example:

```text
RQ-001

How does abnormal condensate formation
affect neuronal development?

Status:
Exploring

Related Papers:
12

Hypotheses:
2

Experiments:
3
```

Suggested statuses:

- Open
- Exploring
- Testing
- Supported
- Rejected
- Resolved

A Research Question should be linkable to:

- projects
- papers
- notes
- hypotheses
- experiments
- results

---

# 9. Hypotheses

Research Questions may contain multiple hypotheses.

Core relationship:

```text
Research Question
        ↓
Hypothesis
        ↓
Experiment
        ↓
Result
        ↓
Interpretation
        ↓
Updated Hypothesis
```

Hypothesis fields:

- description
- evidence
- supporting papers
- contradicting evidence
- related experiments
- current status

Suggested statuses:

- Proposed
- Testing
- Supported
- Weakly Supported
- Rejected

AI may assist with organizing evidence, but must not present speculative AI output as experimental fact.

---

# 10. Literature

## 10.1 Literature Search Strategy

Do not build a full replacement for Google Scholar or PubMed.

Use existing search systems.

Primary sources:

- Google Scholar
- PubMed
- Semantic Scholar
- Europe PMC

The first implementation may open these services in Safari.

## 10.2 AI Literature Discovery

P1 should provide AI-assisted literature discovery.

Example workflow:

```text
User query
↓
Multiple literature sources
↓
Aggregate results
↓
Deduplicate
↓
Rank / filter
↓
AI-assisted recommendations
↓
Related papers
```

Potential capabilities:

- topic-based discovery
- paper relevance ranking
- related-paper discovery
- citation-aware recommendations
- paper clustering
- research-topic summaries

## 10.3 Zotero Integration

Zotero is the primary literature manager.

AI Research OS should not replace Zotero.

Potential integration:

- read Zotero library metadata
- read collections
- read tags
- read references where supported
- associate papers with Projects
- associate papers with Research Questions
- associate papers with Notes
- open papers in external readers

## 10.4 PDF Reading

Do **not** build a custom PDF reader in P0/P1.

Use Xiaolvjing for:

- PDF reading
- highlighting
- text selection
- translation
- annotations
- vocabulary
- reading workflow

AI Research OS should focus on:

- launching the paper in Xiaolvjing
- preserving paper/project relationships
- linking resulting notes back to the relevant research context

---

# 11. Research Inbox

Research Inbox is a central capture mechanism for unprocessed information.

Users should be able to quickly add:

- paper
- idea
- note
- URL
- image
- experiment idea
- research question
- GitHub project
- quotation
- task
- reference

Example:

```text
Research Inbox

• Interesting paper about FUS LLPS
• Maybe test this construct
• New programmable condensate idea
• Figure from paper
• Need to check phosphorylation effect
```

## 11.1 AI Inbox Processing

AI can classify Inbox items into:

```text
Literature
Research Idea
Task
Research Question
Experiment
Note
Reference
Other
```

AI may also suggest:

- target project
- related research question
- tags
- next action

Important:

> AI suggestions should be reviewable. Do not silently reorganize or delete user content.

---

# 12. Research Notes

Research Notes should be separate from Leisure notes.

Support:

- Markdown
- tags
- links
- backlinks
- project associations
- literature associations
- research-question associations
- experiment associations

The long-term knowledge layer should be synchronized with Obsidian where practical.

---

# 13. Experiment Records

Experiment records should be structured rather than being only a blank Markdown page.

Suggested structure:

```text
Experiment

├── Objective
├── Hypothesis
├── Materials
├── Protocol
├── Variables
├── Procedure
├── Raw Data
├── Results
├── Figures
├── Interpretation
├── Problems
└── Next Step
```

## 13.1 Next Step

After an experiment is recorded, AI may assist with:

- summarizing results
- identifying anomalies
- suggesting possible explanations
- suggesting questions for follow-up
- suggesting possible next experiments

Important:

> AI suggestions are advisory and must not automatically become experimental conclusions.

---

# 14. Research Timeline

The system should preserve the evolution of research.

Example:

```text
Paper discovered
      ↓
Research Question created
      ↓
Hypothesis created
      ↓
Experiment
      ↓
Result
      ↓
Interpretation
      ↓
New Hypothesis
```

Users should be able to trace:

> How did I arrive at this conclusion?

This is important for scientific provenance and future review.

---

# 15. Writing

Writing supports:

- papers
- reviews
- research proposals
- research summaries
- lab reports
- research notes

Prefer:

- Markdown
- Obsidian integration
- Git versioning
- literature references
- links to research objects

## 15.1 AI Writing Assistant

Support:

- clarity improvement
- academic style improvement
- logical structure checking
- section summarization
- outline generation
- identification of unsupported claims
- reference suggestions
- argument comparison

AI should not silently overwrite the user's writing.

Preferred workflow:

```text
Select
↓
AI Suggestion
↓
Preview
↓
User Confirmation
↓
Apply
```

---

# 16. Obsidian Integration

Obsidian is the long-term knowledge base.

Recommended relationship:

```text
AI Research OS
       ↓
Obsidian Vault
       ↓
Git
       ↓
Private GitHub Repository
```

Potential synchronized content:

- research notes
- learning notes
- experiment logs
- literature notes
- project notes
- writing

## 16.1 GitHub

Current repository should be:

**Private**

It may be made public in the future.

Support where practical:

- Git status
- commit
- pull
- push
- synchronization
- conflict warning

Do not commit:

- API keys
- passwords
- tokens
- private credentials
- secrets

## 16.2 Large Scientific Data

Do not automatically place large raw scientific datasets in GitHub.

Examples:

- microscopy raw data
- FASTQ
- large model checkpoints
- large datasets
- large binary files

Use appropriate local/cloud storage instead.

GitHub should primarily contain:

- Markdown
- code
- configuration
- documentation
- small datasets

---

# 17. Leisure Space

Leisure must be logically separated from Learning and Research.

Structure:

```text
Leisure

├── Books
├── Movies
├── Games
├── Music
├── Journal
└── Notes
```

The purpose is to allow the user to maintain personal interests without turning the entire system into a research-only environment.

---

# 18. Books / Reading

Book objects should support:

```text
Book

├── Reading Progress
├── Highlights
├── Quotes
├── Notes
├── Thoughts
└── Rating
```

Leisure reading notes should not automatically enter the research knowledge graph.

---

# 19. Global Search

Provide a unified search interface.

Suggested shortcut:

**⌘K**

Search should span:

- Literature
- Projects
- Research Questions
- Hypotheses
- Experiments
- Notes
- Learning
- Leisure
- Inbox

Example:

```text
Search: FUS

Literature
18 papers

Research
2 projects
5 experiments

Obsidian
13 notes

Learning
3 concepts

Leisure
1 book
```

Search should support filtering by type where practical.

---

# 20. Command Palette

Use a VS Code-inspired command palette.

Suggested shortcut:

**⌘ + Shift + P**

Possible commands:

```text
Search papers
Create research note
Create experiment
Create task
Create research question
Add inbox item
Open Zotero
Open Xiaolvjing
Open Obsidian
Start focus mode
Sync Obsidian
Commit changes
```

---

# 21. AI Assistant

AI should be embedded throughout the system, not limited to a standalone chat panel.

## 21.1 Context-Aware AI

When a user opens a paper, project, experiment, or research question, the AI should be able to use relevant context.

Example:

```text
Current Paper
Current Project
Related Notes
Related Papers
Research Questions
Experiments
```

Then the user can ask:

> How is this paper related to my current project?

without manually explaining the research context again.

## 21.2 AI Research Memory

Maintain structured long-term research context such as:

- active projects
- research questions
- hypotheses
- important findings
- research decisions
- terminology
- learning progress
- writing context

The AI should use this context when appropriate.

Important:

> Memory should be inspectable and controllable by the user.

---

# 22. Focus Mode

Support:

- 25 minutes
- 50 minutes
- 90 minutes
- custom duration

Focus Mode should:

- hide Leisure
- hide unrelated modules
- minimize distractions
- show current task
- show timer
- reduce unnecessary AI/UI interruptions

After completion, record:

```text
Focus Session

Task:
Read Paper X

Duration:
52 min

Result:
Completed
```

Focus sessions may contribute to Learning or Research statistics.

---

# 23. UI / UX

The visual language should be inspired by VS Code but should not attempt to clone VS Code.

Recommended structure:

```text
┌──────────────────────────────────────────────────────┐
│ AI Research OS              Search      Settings     │
├────────────┬─────────────────────────┬───────────────┤
│            │                         │               │
│ Navigation │      Workspace          │ AI Context    │
│            │                         │               │
│ Dashboard  │                         │               │
│ Learning   │                         │               │
│ Research   │                         │               │
│ Literature │                         │               │
│ Leisure    │                         │               │
│ Inbox      │                         │               │
│            │                         │               │
└────────────┴─────────────────────────┴───────────────┘
```

Primary goals:

- clean
- scientific
- elegant
- information-dense
- low-distraction
- comfortable for long sessions

---

# 24. Themes and Languages

## 24.1 Appearance

Support:

- Light Mode
- Dark Mode

## 24.2 Themes

Support multiple visual themes while maintaining readability and accessibility.

## 24.3 Languages

Support:

- Chinese
- English

Language switching should affect:

- UI
- menus
- settings
- system prompts
- application-generated labels

Do not automatically translate user-authored research content.

---

# 25. macOS and Safari

## 25.1 First Deployment Strategy

Prefer a:

**Local Web App**

Example:

```text
http://localhost:<port>
```

Use Safari as the primary client.

Benefits:

- lightweight
- easy to develop
- easy to update
- avoids unnecessary Electron overhead
- easier future portability

## 25.2 Electron

Do not use Electron in the initial implementation unless there is a compelling technical requirement.

Avoid unnecessary Chromium/Node background processes.

## 25.3 macOS Quick Access

A future lightweight launcher may provide:

- menu bar access
- floating launcher
- global keyboard shortcut

This should remain lightweight.

## 25.4 Dynamic Island

Dynamic Island support is not part of the core implementation.

It may be considered later as an optional quick-action surface for:

- current task
- focus timer
- quick Inbox capture
- quick research actions

It must not complicate the core architecture.

---

# 26. Performance Requirements

Performance is a first-class requirement.

The application should:

- prioritize local execution
- minimize background processes
- avoid unnecessary polling
- prefer event-driven updates
- lazy-load large modules
- paginate large datasets
- use virtual scrolling where appropriate
- avoid loading an entire Zotero library unnecessarily
- invoke AI only when needed
- avoid expensive real-time synchronization unless necessary

Target behavior:

> The application should be lightweight enough to run alongside Safari, VS Code, Obsidian, Python/Jupyter, and other research tools without materially degrading system performance.

---

# 27. Data Architecture Principles

Use a local-first architecture.

Conceptually:

```text
Local Application Database
      │
      ├── Tasks
      ├── Projects
      ├── Research Questions
      ├── Hypotheses
      ├── Experiments
      ├── Inbox
      └── Settings

External Systems
      │
      ├── Zotero
      ├── Obsidian
      ├── GitHub
      └── Xiaolvjing
```

Core principle:

> **AI Research OS should store relationships, metadata, workflow state, and indexes, while mature external tools remain responsible for their specialized data.**

---

# 28. Core Research Data Relationships

The main research relationship is:

```text
Project
   │
   ├── Research Questions
   │       │
   │       └── Hypotheses
   │               │
   │               └── Experiments
   │
   ├── Literature
   │
   ├── Notes
   │
   ├── Data
   │
   └── Writing
```

Learning-to-research relationship:

```text
Learning Concept
      ↓
Research Project
      ↓
Experiment
```

Literature workflow:

```text
Paper
 ↓
Zotero
 ↓
Xiaolvjing
 ↓
Obsidian
 ↓
Research Project
```

---

# 29. P0 — Must Implement

P0 is mandatory for the current development cycle.

## Core

- [ ] Dashboard
- [ ] Navigation
- [ ] Global Search
- [ ] Command Palette
- [ ] Inbox

## Learning

- [ ] Learning Dashboard
- [ ] Calendar
- [ ] Tasks
- [ ] Daily Check-in
- [ ] Learning Roadmap
- [ ] Learning Notes
- [ ] Progress Tracking
- [ ] Basic AI Learning Assistant

## Research

- [ ] Projects
- [ ] Research Questions
- [ ] Hypotheses
- [ ] Literature
- [ ] Research Notes
- [ ] Experiments
- [ ] Writing
- [ ] Research Timeline

## Integrations

- [ ] Zotero integration
- [ ] Obsidian integration
- [ ] GitHub integration
- [ ] Xiaolvjing launch/deep-link integration if supported
- [ ] Google Scholar external search
- [ ] PubMed external search
- [ ] Semantic Scholar external search
- [ ] Europe PMC external search

## Leisure

- [ ] Books
- [ ] Reading Progress
- [ ] Reading Notes
- [ ] Basic Leisure Notes

## UI

- [ ] Dark Mode
- [ ] Light Mode
- [ ] Theme Switching
- [ ] Chinese
- [ ] English
- [ ] Focus Mode
- [ ] Responsive Layout

## Platform

- [ ] Local Web App
- [ ] Safari support
- [ ] Low memory usage
- [ ] macOS keyboard shortcuts

---

# 30. P1 — Must Implement

P1 is also part of the current development scope.

## AI

- [ ] AI Literature Discovery
- [ ] AI Paper Summary
- [ ] AI Figure Explanation
- [ ] AI Paper Comparison
- [ ] AI Research Assistant
- [ ] AI Research Memory
- [ ] Context-aware AI

## Learning

- [ ] AI Quiz
- [ ] AI Flashcards
- [ ] Knowledge-gap detection
- [ ] Learning ↔ Research connections

## Research

- [ ] Research Question tracking
- [ ] Hypothesis evidence tracking
- [ ] Research Timeline enhancement
- [ ] Research knowledge graph
- [ ] Related-paper recommendations
- [ ] Experiment next-step suggestions
- [ ] Research statistics

## Inbox

- [ ] AI classification
- [ ] AI project suggestion
- [ ] AI research-question suggestion
- [ ] AI task extraction

## Search

- [ ] Cross-source search
- [ ] Search Literature
- [ ] Search Projects
- [ ] Search Notes
- [ ] Search Experiments
- [ ] Search Learning
- [ ] Search Leisure

---

# 31. P2 — Explicitly Out of Scope

Do not implement P2 in the current project.

The following are explicitly excluded:

- custom full PDF reader
- custom Google Scholar replacement
- custom Zotero replacement
- custom translation engine
- custom OCR system
- custom vocabulary system
- Electron desktop application
- full Dynamic Island interaction
- local large language model
- automated scientific decision-making
- automated experiment execution
- automated scientific conclusion generation
- automatic upload of all raw research data
- large-scale scientific data analysis platform

These may be reconsidered in a future project phase.

---

# 32. AI Safety and Scientific Integrity

AI is an assistant, not a replacement for scientific judgment.

The system must avoid:

- presenting AI speculation as experimental evidence
- fabricating references
- silently modifying scientific records
- silently deleting notes
- silently overwriting research data
- automatically converting suggestions into scientific conclusions

For high-impact operations:

```text
Preview
↓
User Confirmation
↓
Apply
```

Examples:

- modifying research notes
- changing experiment records
- reorganizing projects
- syncing destructive changes
- deleting records
- overwriting files

---

# 33. Git / GitHub Requirements

Repository:

**Private**

Future:

**May become public**

Repository should include:

- README
- architecture documentation
- setup documentation
- environment configuration examples
- `.gitignore`
- Git history
- version tags

Never commit:

- API keys
- passwords
- access tokens
- credentials
- secrets
- private configuration containing sensitive values

---

# 34. Development Method

Do not generate the entire system in one step.

Recommended sequence:

```text
Phase 1
Architecture
↓
Phase 2
Core UI
↓
Phase 3
Dashboard
↓
Phase 4
Learning
↓
Phase 5
Research
↓
Phase 6
Integrations
↓
Phase 7
AI
↓
Phase 8
P1 Features
↓
Testing
↓
Optimization
```

Each phase should:

1. be implemented
2. be run locally
3. be tested
4. have bugs fixed
5. have architecture/documentation updated
6. only then proceed to the next phase

---

# 35. Development Principles

DeepSeek Harness must follow these principles throughout development.

### Principle 1 — Avoid Feature Bloat

Do not increase complexity merely to increase feature count.

### Principle 2 — Integrate Before Rebuilding

Prefer mature external applications and APIs.

### Principle 3 — AI Must Be Workflow-Aware

AI should be embedded into Learning, Literature, Research Questions, Experiments, Writing, and Inbox workflows.

### Principle 4 — Project Is the Research Organization Layer

Projects organize research resources.

### Principle 5 — Research Question Is the Scientific Logic Layer

Questions connect literature, hypotheses, experiments, and conclusions.

### Principle 6 — Inbox Is the Capture Layer

Anything not yet organized can enter Inbox.

### Principle 7 — Obsidian Is the Long-Term Knowledge Base

Do not replace Obsidian.

### Principle 8 — Zotero Is the Literature Manager

Do not replace Zotero.

### Principle 9 — Xiaolvjing Is the PDF Reader

Do not replace Xiaolvjing.

### Principle 10 — AI Research OS Is the Orchestration Layer

The application connects the tools and workflows into one coherent research environment.

---

# 36. Target End-to-End Workflow

The complete research workflow should eventually look like:

```text
                    ┌──────────────┐
                    │   Learning   │
                    └──────┬───────┘
                           │
                           ↓
                       Knowledge
                           │
                           ↓
                     Research Idea
                           │
                           ↓
                      Research
                       Project
                           │
                           ↓
                  Research Question
                           │
                           ↓
                      Hypothesis
                           │
                           ↓
                     Literature
                           │
                           ↓
                      Experiment
                           │
                           ↓
                        Result
                           │
                           ↓
                    Interpretation
                           │
                           ↓
                  Updated Hypothesis
                           │
                           ↓
                       Writing
                           │
                           ↓
                     Publication
```

Unstructured information should follow:

```text
Anything
   ↓
Research Inbox
   ↓
AI Classification
   ↓
Project / Literature / Task / Question / Note
```

Long-term knowledge should follow:

```text
Research OS
      ↓
   Obsidian
      ↓
     Git
      ↓
   GitHub
```

---

# 37. Final Product Vision

When the user opens the system, it should provide one unified place to answer:

```text
Today

├── What should I learn?
├── What should I research?
├── What experiments need attention?
├── What papers should I read?
├── What should I write?
└── What did I accomplish?
```

The system should not become another application that requires significant maintenance.

The ultimate goal is:

> **Make personal research more continuous, traceable, searchable, organized, and AI-assisted.**

---

# 38. Final Development Directive for DeepSeek Harness

Build this project as a lightweight **Personal Research OS** for an individual biology researcher.

The system must integrate **Learning, Research, and Leisure** into one coherent workspace while keeping their data and workflows logically separated.

Do not rebuild mature tools such as Zotero, PDF readers, Google Scholar, PubMed, or Obsidian. Integrate with them whenever possible.

The application should act as an orchestration and intelligence layer connecting these tools.

The primary research domain is biology, especially:

- Liquid-Liquid Phase Separation (LLPS)
- aberrant condensates in neurodevelopment
- programmable condensates
- AI protein design

The core research model is:

**Project → Research Question → Hypothesis → Literature → Experiment → Result → Interpretation → Writing**

The core capture workflow is:

**Research Inbox → AI Classification → Project / Literature / Task / Question / Note**

AI should be context-aware and embedded into workflows rather than being implemented only as a standalone chatbot.

**P0 and P1 are both in scope for the current development cycle.**

**P2 is explicitly out of scope and must not be implemented.**

Prioritize:

- correctness
- maintainability
- low memory usage
- modular architecture
- data safety
- user confirmation for destructive or high-impact operations
- future extensibility
- clean UX
- local-first operation

The first deployment should preferably be a lightweight local Web App running in Safari on macOS.

Avoid Electron unless a compelling technical requirement is demonstrated.

Do not attempt to implement the entire application in one step.

Build incrementally, test each module, maintain clear architecture and documentation, and ensure each completed phase remains functional before proceeding.

**The goal is not to build another note-taking application.**

**The goal is to build a personal AI-powered research operating system.**
