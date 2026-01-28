# Claude Code Project Configuration

## Parallel Subagent Orchestration

When working on tasks in this project, ALWAYS use parallel subagent orchestration:

### Default Behavior
- **Spawn multiple subagents in parallel** for any non-trivial task
- **Never work sequentially** when parallel execution is possible
- **Maximize concurrency** - if tasks are independent, run them simultaneously

### Standard Parallel Patterns

For **implementation tasks**, spawn these agents in parallel:
1. **Explore agent** - Investigate codebase structure and find relevant files
2. **Plan agent** - Design the implementation approach
3. **Additional Explore agents** as needed for different aspects of the codebase

For **coding tasks**, spawn these agents in parallel:
1. **Multiple coding agents** - Each working on different files/components simultaneously
2. **Review agent** - Running in background to review changes as they complete

For **bug fixes**, spawn in parallel:
1. **Explore agent** - Find the bug location and understand the issue
2. **Explore agent** - Find related test files and patterns
3. **Plan agent** - Design the fix approach

For **refactoring**, spawn in parallel:
1. **Explore agents** - Map all affected files and dependencies
2. **Plan agent** - Design the refactoring strategy
3. **Coding agents** - Work on independent file changes simultaneously

### Orchestration Rules
- Launch all independent agents in a **single message with multiple Task tool calls**
- Use **background agents** (`run_in_background: true`) for long-running tasks
- Check on background agents periodically and coordinate results
- When one agent's output informs another's work, launch the dependent agent immediately after receiving results
- Always prefer **haiku model** for quick exploration tasks to minimize latency
- Use **sonnet model** for coding and complex reasoning tasks

### Review Pattern
After any code changes, always spawn a parallel review agent to:
- Verify the changes compile/work correctly
- Check for potential issues or improvements
- Ensure consistency with the codebase patterns
