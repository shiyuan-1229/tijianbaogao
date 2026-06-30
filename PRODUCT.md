# Product

## Register

product

## Users

Store operators, regional managers, and brand operations teams use Store AI Clinic while reviewing daily and weekly store performance. They need a calmer way to upload reports, understand anomalies, and decide what action to take next without reading workflow internals.

## Product Purpose

Store AI Clinic turns store reports, knowledge documents, and operating rules into a collaborative diagnosis workflow. The product exists to help teams move from "what happened today" to "what matters, why it matters, and what to do next" faster than a dashboard-heavy operator console.

## Brand Personality

Calm, trustworthy, and action-oriented. The interface should feel like an experienced AI analyst working alongside the user: clear in progress, careful in language, and practical in recommendations.

## Anti-references

- Traditional admin dashboards that lead with dense KPI blocks before explaining what changed
- Workflow monitoring tools that expose task IDs, raw execution states, and backend metadata in the primary UI
- Over-decorated AI products that use visual noise, excessive motion, or technical jargon instead of decision-ready guidance

## Design Principles

- Lead with user value: show what is happening, what was found, and what the user should do next before any system detail
- Keep the product conversational: progress, confirmations, findings, and recommendations should read like collaboration, not monitoring
- Reduce operational noise: backend metadata, raw errors, and debug traces belong in logs or developer-only surfaces
- Support decisions, not browsing: each page should help the user complete a diagnosis task with minimal navigation overhead
- Keep configuration tied to outcomes: setup pages should explain how they improve the agent's judgment, not just expose controls

## Accessibility & Inclusion

Target WCAG 2.1 AA contrast and keyboard accessibility across the Next.js workspace. Motion should stay purposeful and low-intensity, with reduced-motion fallbacks for non-essential transitions. Error and progress copy should use plain language so non-technical operators can understand the system state without specialist knowledge.
