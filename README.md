# @monkin/history

[![CI](https://github.com/monkin/history/actions/workflows/ci.yml/badge.svg)](https://github.com/monkin/history/actions/workflows/ci.yml)

An immutable library for document history management with first-class undo/redo support.

While any document state can be reconstructed by replaying operations from the beginning, `@monkin/history` optimizes this process by combining an operation timeline with state snapshots.

> **Core Concept**
>
> `Current State = Latest Snapshot + Subsequent Operations`

> [!TIP]
> **Built for Synchronization**
>
> Since history is immutable, you can save a reference at any moment and later `diff` it with the newest version. This makes it easy to implement background persistence or synchronization logic.

---

## Features

- **Immutable by Design**: Every operation returns a new instance of `OperationList` or `SnapshotList`.
- **Linked-List Timeline**: Operations are modeled as a sequence where each entry points to its predecessor, allowing efficient undo/redo traversal.
- **Flexible ID Generation**: Use numeric IDs, UUIDs, or any custom identifier.
- **Decoupled Snapshots**: Manage state snapshots independently for maximum architectural flexibility.

---

## Installation

```bash
npm install @monkin/history
```

---

## Core Components

### OperationList

Tracks document operations and manages the undo/redo pointer.

> [!IMPORTANT]
> The `IdGenerator` must always return an identifier strictly greater than the provided `maxId`. This is required for correct history traversal and ordering.

#### Basic Usage

```typescript
import { OperationList } from "@monkin/history";

// Initialize with an ID generator
const generateId: OperationList.IdGenerator<number> = (maxId) => (maxId ?? 0) + 1;
let history = OperationList.empty<number, string>(generateId);

// Record operations
history = history.add("Add Header");
history = history.add("Change Background");

// Undo and Redo
if (history.canUndo) history = history.undo(); // Moves pointer back
if (history.canRedo) history = history.redo(); // Moves pointer forward

// Reconstruct state from the current branch
for (const entry of history) {
    console.log(entry.operation);
}
```

#### API Highlights

- `history.current`: The ID of the current operation.
- `history.isUndone(id)`: Checks if an operation exists but is currently undone.
- `history.ageOf(id)`: Distance between current state and a given entry.
- `history.get(id)`: Retrieves an entry reachable from the current state.
- `history.entry(id)`: Retrieves an entry by ID, including undone ones.
- `history.entries()`: Generator yielding all recorded entries.
- `[Symbol.iterator]`: Iterates over the current branch (skipping undone operations).
- `history.upload(items)`: Bulk-upload entries, useful for partial history loading.
- `OperationList.diff(before, after)`: Static method comparing two history lists to find added, removed, or changed operations.

---

### SnapshotList

An immutable collection for managing state snapshots indexed by identifiers.

#### Basic Usage

```typescript
import { SnapshotList } from "@monkin/history";

let snapshots = SnapshotList.empty<number, string>();

// Add and retrieve snapshots
snapshots = snapshots.add(1, "Initial Content");
const item = snapshots.get(1);
console.log(item?.snapshot); // "Initial Content"

// Cleanup
snapshots = snapshots.remove(1);
```

#### API Highlights

- `snapshots.add(id, snapshot)`: Adds a new snapshot.
- `snapshots.addAll(items)`: Bulk-add snapshots from an iterable.
- `snapshots.remove(id)`: Removes a snapshot by its ID.
- `snapshots.get(id)`: Retrieves a snapshot item by ID.
- `snapshots.filter(predicate)`: Filter snapshots into a new list.
- `[Symbol.iterator]`: Iterates over all items in sorted order.
- `SnapshotList.diff(before, after)`: Static method comparing two snapshot lists to find added, removed, or changed items.

---

## Design Philosophy

### Why Decoupled?

`OperationList` and `SnapshotList` are intentionally separate primitives. This approach avoids imposing a specific state structure and enables complex compositions:

- **Modular Architecture**: Most apps use one list of each, but some require more. An animation editor might use one `OperationList` for global actions but 30 separate `SnapshotList` instances—one per frame.
- **Lightweight**: The library provides the mathematical primitives; you can easily wrap them in a higher-level "History Manager" tailored to your application's needs.

### Historical Note

`OperationList` was originally named `History`. It was renamed to keep the `History` name available for consumers who want to implement their own domain-specific manager by combining these primitives.

---

## Performance

The library is optimized for the latest history items. While accessing very deep history might be slower, it typically remains efficient enough for standard use cases. Use snapshots strategically to keep the number of operations to replay minimal.

---

## Development

- `npm run dev`: Start Vite development server.
- `npm run build`: Build the project (TypeScript & Vite).
- `npm run test`: Run tests using Vitest.
- `npm run lint`: Lint the project.
- `npm run format`: Format the project.
- `npm run prepublishOnly`: Build, lint, and test before publish.

---

## License

MIT
