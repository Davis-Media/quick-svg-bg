# AGENTS.md - Quick SVG Background

## Build/Development Commands

- `bun dev` - Start development server
- `bun build` - Build for production
- `bun check` - Run TypeScript and Svelte checks
- `bun format` - Format code with Prettier
- `bun lint` - Check code formatting

## Code Style Guidelines

- **Formatting**: Use tabs, single quotes, no trailing commas, 100 char line width
- **TypeScript**: Strict mode enabled, use proper types for all variables
- **Svelte**: Use runes (`$state`, `$effect`) for reactivity, TypeScript in script tags
- **Imports**: Use ES modules, prefer named imports from `@lucide/svelte`
- **Error Handling**: Use try-catch for clipboard operations, console.error for debugging
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Styling**: Tailwind CSS with dark mode support, use semantic color classes
