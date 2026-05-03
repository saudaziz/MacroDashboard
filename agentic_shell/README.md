# Agentic Shell

This directory contains the agent-native architecture wrapping the legacy codebase, adhering to the 30 Agentic First Principles.

- **capabilities/**: Machine-readable manifests (JSON/YAML) of system components.
- **adapters/**: Proxy wrappers that convert legacy exceptions into explicit Result types and isolate I/O.
- **routers/**: Pure decision logic that coordinates between adapters and manages flow.
- **state/**: Immutable state management and explicit transition logic.
- **logs/**: Structured, replayable decision records and reasoning traces.