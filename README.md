# @monkin/history

An immutable operation list management library for tracking operations and state snapshots.

## Features

- **Read-only Operation List**: A sequence of operations modeled as a linked list, where each entry points to its predecessor.
- **Undo/Redo**: Navigation through the operation list by moving a `current` pointer.
- **Immutable State**: Every operation returns a new instance of `OperationList` or `SnapshotList`.
- **Custom ID Generation**: Flexibile identifier management for operation list entries.
- **Snapshot Management**: A separate `SnapshotList` to store and retrieve state snapshots.

## Installation

```bash
npm install @monkin/history
```

## Core Components

### OperationList

`OperationList` tracks operations and enables navigating through the operation list path.

> **Note**: The `IdGenerator` must always return an identifier that is strictly greater than the `maxId` provided to it. This is required for correct operation of the history.

#### Basic Usage

```typescript
import { OperationList } from "@monkin/history";

// 1. Initialize with an ID generator
const generateId: OperationList.IdGenerator<number> = (maxId) => (maxId ?? 0) + 1;
let operationList = OperationList.empty<number, string>(generateId);

// 2. Add an operation
operationList = operationList.add("Create Node");
operationList = operationList.add("Move Node");

// 3. Navigate through the operation list
if (operationList.canUndo) {
    operationList = operationList.undo(); // Pointer moves to "Create Node"
}

if (operationList.canRedo) {
    operationList = operationList.redo(); // Pointer moves back to "Move Node"
}

// 4. Iterate over current branch
for (const entry of operationList) {
    console.log(entry.operation);
}
```

#### API Highlights

- `operationList.current`: The identifier of the current operation.
- `operationList.get(id)`: Retrieves an entry if it's reachable from the current state.
- `operationList.entry(id)`: Retrieves an entry by ID, even if it's currently undone.
- `operationList.entries()`: A generator that yields all entries in the operation list, including undone ones.
- `[Symbol.iterator]`: The `OperationList` object itself is iterable and yields entries from the current branch (skipping undone operations).
- `operationList.isUndone(id)`: Checks if an operation exists but is currently undone.
- `operationList.ageOf(id)`: Calculates the generation distance between the current state and a given entry.
- `operationList.upload(items)`: Uploads a list of entries to the operation list, useful for partial operation list loading.

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

### Why Decoupled?

`OperationList` (the operation list) and `SnapshotList` are intentionally decoupled to provide maximum flexibility.

While most applications use a single operation list and a single snapshot list, some use cases require more complex compositions. For example, an animation editor might have a single `OperationList` for global actions but 30 separate `SnapshotList` instances—one for each frame.

By keeping these components separate, the library remains lightweight and avoids imposing a specific structure. A combined component managing both can be added by the user or may be included in the library later if needed.

## Performance

The library works effectively with the latest items. Accessing deep history may result in slower performance, but it typically remains acceptable for most use cases.

## Basic Workflow

1. **Setup**: Create a `OperationList` instance using `OperationList.empty()` with a custom `IdGenerator` (e.g., numeric or UUID). **Note**: Every next generated key must be greater than the provided `maxId`.
2. **Execute and Record**: When a user performs an action, call `operationList.add(operation)` to record it. This returns a new `OperationList` instance representing the updated state.
3. **Undo/Redo**: Move the `current` pointer using `operationList.undo()` and `operationList.redo()`. This allows the application to traverse back and forth through recorded operations.
4. **State Reconstruction**: Iterate through the `operationList` object (which follows the `previous` pointers from the `current` entry) to reconstruct the application state from operations.
5. **Optimize with Snapshots**: Use `SnapshotList` to store full state snapshots at strategic points in history. This allows for faster state reconstruction by starting from a snapshot instead of replaying all operations from the beginning.

## Scripts

- `npm run dev`: Start Vite development server.
- `npm run build`: Build the project (TypeScript & Vite).
- `npm run test`: Run tests using Vitest.
- `npm run lint`: Lint the project with Biome.
- `npm run format`: Format the project with Biome.

## License

MIT
