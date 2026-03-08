# @monkin/history

An immutable history management library for tracking operations and state snapshots.

## Features

- **Read-only History**: A sequence of operations modeled as a linked list, where each entry points to its predecessor.
- **Undo/Redo**: Navigation through history by moving a `current` pointer.
- **Immutable State**: Every operation returns a new instance of `History` or `SnapshotList`.
- **Custom ID Generation**: Flexibile identifier management for history entries.
- **Snapshot Management**: A separate `SnapshotList` to store and retrieve state snapshots.

## Installation

```bash
npm install @monkin/history
```

## Core Components

### History

`History` tracks operations and enables navigating through the history path.

> **Note**: The `IdGenerator` must always return an identifier that is strictly greater than the `maxId` provided to it. This is required for correct operation of the history.

#### Basic Usage

```typescript
import { History } from "@monkin/history";

// 1. Initialize with an ID generator
const generateId: History.IdGenerator<number> = (maxId) => (maxId ?? 0) + 1;
let history = History.empty<number, string>(generateId);

// 2. Add an operation
history = history.add("Create Node");
history = history.add("Move Node");

// 3. Navigate through history
if (history.canUndo) {
    history = history.undo(); // Pointer moves to "Create Node"
}

if (history.canRedo) {
    history = history.redo(); // Pointer moves back to "Move Node"
}

// 4. Iterate over current branch
for (const entry of history) {
    console.log(entry.operation);
}
```

#### API Highlights

- `history.current`: The identifier of the current operation.
- `history.get(id)`: Retrieves an entry if it's reachable from the current state.
- `history.entry(id)`: Retrieves an entry by ID, even if it's currently undone.
- `history.entries()`: A generator that yields all entries in the history, including undone ones.
- `[Symbol.iterator]`: The `History` object itself is iterable and yields entries from the current branch (skipping undone operations).
- `history.isUndone(id)`: Checks if an operation exists but is currently undone.
- `history.ageOf(id)`: Calculates the generation distance between the current state and a given entry.
- `history.upload(items)`: Uploads a list of entries to the history, useful for partial history loading.

### SnapshotList

`SnapshotList` is an immutable collection used to store and manage snapshots indexed by identifiers.

#### Basic Usage

```typescript
import { SnapshotList } from "@monkin/history";

let snapshots = SnapshotList.empty<number, string>();

// Add a snapshot
snapshots = snapshots.add(1, "Initial Content");

// Get a snapshot
const item = snapshots.get(1);
console.log(item?.snapshot); // "Initial Content"

// Remove a snapshot
snapshots = snapshots.remove(1);
```

#### API Highlights

- `snapshots.get(id)`: Retrieves a snapshot item by its ID.
- `snapshots.add(id, snapshot)`: Adds a new snapshot to the list.
- `snapshots.addAll(items)`: Adds multiple snapshots from an iterable.
- `snapshots.remove(id)`: Removes a snapshot by its ID.
- `snapshots.filter(predicate)`: Returns a new `SnapshotList` containing only items that satisfy the predicate.
- `[Symbol.iterator]`: The `SnapshotList` object itself is iterable and yields all items in sorted order.

## Performance

The library works effectively with the latest items. Accessing deep history may result in slower performance, but it typically remains acceptable for most use cases.

## Basic Workflow

1. **Setup**: Create a `History` instance using `History.empty()` with a custom `IdGenerator` (e.g., numeric or UUID). **Note**: Every next generated key must be greater than the provided `maxId`.
2. **Execute and Record**: When a user performs an action, call `history.add(operation)` to record it. This returns a new `History` instance representing the updated state.
3. **Undo/Redo**: Move the `current` pointer using `history.undo()` and `history.redo()`. This allows the application to traverse back and forth through recorded operations.
4. **State Reconstruction**: Iterate through the `history` object (which follows the `previous` pointers from the `current` entry) to reconstruct the application state from operations.
5. **Optimize with Snapshots**: Use `SnapshotList` to store full state snapshots at strategic points in history. This allows for faster state reconstruction by starting from a snapshot instead of replaying all operations from the beginning.

## Scripts

- `npm run dev`: Start Vite development server.
- `npm run build`: Build the project (TypeScript & Vite).
- `npm run test`: Run tests using Vitest.
- `npm run lint`: Lint the project with Biome.
- `npm run format`: Format the project with Biome.

## License

MIT
