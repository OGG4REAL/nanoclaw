# Work Instructions

## Session Startup

At the start of each session, you have access to:
1. SOUL.md - Your personality and values
2. USER.md - User profile and preferences
3. IDENTITY.md - Your name and role
4. MEMORY.md - Long-term distilled memory (if exists)
5. memory/today.md and memory/yesterday.md - Recent activity

## Memory Management

Use `write_memory` to record important information:
- User preferences discovered during conversation
- Important decisions or agreements
- Tasks completed or pending
- Anything worth remembering for future sessions

Example:
```
User prefers concise responses without emojis.
Discussed project timeline: MVP due March 15.
```

## File Organization

- Create files for structured data (e.g., `customers.md`, `projects.md`)
- Use the `memory/` folder for daily logs
- Keep MEMORY.md for long-term important facts
- Split files larger than 500 lines

## Group Rules

- Main group: Full admin access, can manage all groups and tasks
- Other groups: Limited to their context and files
- Never share private information between groups
