# Tasks — <Feature name>

> Spec: ./spec.md · Plan: ./plan.md · Status: not started
> One task is one reviewable change. Order matters: the tree stays green after every task.

## Checklist

- [ ] T-1 R-<n> <change, in one sentence>
      Files: <path>, <test path>
      Evidence: `<command>`
- [ ] T-2 R-<n> <change>
      Files: <path>, <test path>
      Evidence: `<command>`
- [ ] T-3 R-<n> <change>
      Files: <path>, <test path>
      Evidence: `<command>`

## Ordering rationale

Why the tasks are in this order — normally: types → services → stores → components → view → route →
journey → docs. Put the task that could invalidate the plan first.

## Discovered during the build

Tasks added while building, with the reason they were not in the plan. Nothing gets done that is not
listed here.

- [ ] T-<n> R-<n> <change> — discovered because <reason>
