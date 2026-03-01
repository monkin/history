import { List } from "./list";

/**
 * Read-only history of operations.
 *
 * It contains a linked list of operations with references to the previous one.
 * Operation can be added to the history, but cannot be removed.
 *
 * Undo/redo operations are implemented by moving the `current` operation pointer.
 *
 * For one-click operations everything a straight forward. Continuous operations
 * (resizing while mouse moving, for example) should be stored outside until the
 * operation is finished ('mouseup' in case of resizing).
 */
export class History<Key extends string | number, Operation> {
    /** @internal */
    constructor(
        /** @internal */
        readonly items: List<History.Item<Key, Operation>>,
        /**
         * Pointer to the current entry in the history.
         * It can be moved by undo/redo operations.
         */
        readonly current: Key | undefined,
        /**
         * Function to generate a new unique key for an entry.
         * It receives the biggest Id in the history if any.
         * The generated key should be bigger than the provided one.
         */
        readonly generateId: History.KeyGenerator<Key>,
    ) {}

    /**
     * Upload a list of items to the history.
     * This operation should be used for partial history loading.
     * It won't change `current`, since it uploads older item.
     */
    upload(items: History.Item<Key, Operation>[]): History<Key, Operation> {
        return new History(
            this.items.insertAll(items),
            this.current,
            this.generateId,
        );
    }

    get canUndo(): boolean {
        return this.current !== undefined;
    }

    get canRedo(): boolean {
        return this.items.maxId !== this.current;
    }

    /**
     * Add a new operation to the history.
     */
    add(operation: Operation): History<Key, Operation> {
        const { items, current, generateId } = this;

        const id = generateId(items.maxId);
        return new History(
            items.insert({ id, operation, previous: current }),
            id,
            generateId,
        );
    }

    undo(): History<Key, Operation> {
        const { items, current, generateId } = this;

        if (current === undefined) return this;

        return new History(
            items,
            current && items.get(current)?.previous,
            generateId,
        );
    }

    redo(): History<Key, Operation> {
        const { items, current, generateId } = this;
        const { maxId } = items;

        if (current === maxId || maxId === undefined) return this;

        for (const item of items.iterate(maxId)) {
            if (item.previous === current) {
                return new History(items, item.id, generateId);
            }
        }

        return this;
    }

    /**
     * Retrieves a generator that yields all (undone too) items in the history.
     */
    *all(): Generator<History.Item<Key, Operation>> {
        return yield* this.items;
    }

    /**
     * Iterate over history. Undone operations are skipped.
     *
     * To iterate over all operations, use `for (const item of history.all()) { ... }` instead.
     */
    [Symbol.iterator](): Generator<History.Item<Key, Operation>> {
        return this.items.iterate(this.current);
    }

    static empty<Key extends string | number, Operation>(
        generateId: History.KeyGenerator<Key>,
    ): History<Key, Operation> {
        return new History(new List([], undefined), undefined, generateId);
    }
}

export namespace History {
    export interface Item<Id extends string | number, Operation> {
        readonly id: Id;
        readonly previous: Id | undefined;
        readonly operation: Operation;
    }

    export type Key<T extends Item<string | number, unknown>> = T["id"];
    export type Value<T extends Item<string | number, unknown>> =
        T["operation"];

    /**
     * Generate a new key for the history.
     * @param maxKey The biggest key in the history, or undefined if the history is empty.
     * @returns A new key. It must be bigger than the provided one.
     */
    export type KeyGenerator<Key extends string | number> = (
        maxKey: Key | undefined,
    ) => Key;
}
