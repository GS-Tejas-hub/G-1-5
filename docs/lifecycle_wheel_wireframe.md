# Execution Wheel — UI Wireframe Spec (v1)

This repo now includes a **Circular Lifecycle Wheel** UI to support your *Execution Dashboard* concept.

## Layout (exact)
- **Top header bar**
  - Title: **Execution Wheel**
  - Context: Persona role + selected regulation version
  - Action: **Reset Wheel**
- **Main content**
  - **Left**: Circular Wheel with 10 phases (clickable segments)
  - **Right**: Side panel
    - Phase title + status
    - Summary / intent
    - Block reasons (if any)
    - Actions: Back / Next / Mark Done / Reopen
    - Legend + tips

## Wireframe asset
- `src/assets/lifecycle_wheel_wireframe.svg`

## Phases
Order (clockwise):
1. Inventory Ready
2. Define Scope
3. Assess Applicability
4. Plan Work
5. Collect Data
6. Validate Data
7. Compute Readiness
8. Approvals
9. Submission
10. Audit Trace (planned)

## Status rules
- **DONE**: explicit done flag set
- **AVAILABLE**: all prior phases done
- **LOCKED**: prior phase(s) incomplete
- **BLOCKED**: `blockedBy[phase]` contains reasons

## Implementation mapping
- Component: `src/components/LifecycleWheel.tsx`
- State machine: `src/state/lifecycleMachine.ts`
- Page: `src/pages/LifecycleWheelPage.tsx`
- App integration: `src/App.tsx` (adds a new top tab)
