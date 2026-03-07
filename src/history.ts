import { ageOf } from "./age-cache.ts";
import { List } from "./list";

/**
 * Read-only history of values.
 *
 * It contains a linked list of values with references to the previous one.
 * Value can be added to the history but cannot be removed.
 *
 * Undo/redo are implemented by moving the `current` value pointer.
 *
 * For one-click actions everything is straight forward. Continuous actions
 * (resizing while mouse moving, for example) should be stored outside until the
 * value is finished ('mouseup' in case of resizing).
 */
export class History<Key extends string | number, Operation> {
    /** @internal */
    constructor(
        /** @internal */
        readonly items: List<History.Entry<Key, Operation>>,
        /**
         * Pointer to the current entry in the history.
         * It can be moved by undo/redo.
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
     * Calculates the age position of an element identified by the given id within a collection.
     * The method iterates through the collection, compares ids, and determines the position if found.
     * `undefined` means that the id is not present in the collection or was undone.
     */
    ageOf(id: Key): number | undefined {
        return ageOf(this, id);
    }

    /**
     * Upload a list of items to the history.
     * This value should be used for partial history loading.
     * It won't change `current`, since it uploads older item.
     */
    upload(items: History.Entry<Key, Operation>[]): History<Key, Operation> {
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
     * Add a new value to the history.
     */
    add(value: Operation): History<Key, Operation> {
        const { items, current, generateId } = this;

        const id = generateId(items.maxId);
        return new History(
            items.insert({ id, value, previous: current }),
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
    *all(): Generator<History.Entry<Key, Operation>> {
        return yield* this.items;
    }

    /**
     * Iterate over history. Undone values are skipped.
     *
     * To iterate over all values, use `for (const item of history.all()) { ... }` instead.
     */
    [Symbol.iterator](): Generator<History.Entry<Key, Operation>> {
        return this.items.iterate(this.current);
    }

    static empty<Key extends string | number, Value>(
        generateId: History.KeyGenerator<Key>,
    ): History<Key, Value> {
        return new History(new List([], undefined), undefined, generateId);
    }

    static fromItems<Key extends string | number, Value>(
        current: Key | undefined,
        items: History.Entry<Key, Value>[],
        generateId: History.KeyGenerator<Key>,
    ): History<Key, Value> {
        return new History(
            new List<History.Entry<Key, Value>>([], undefined).insertAll(items),
            current,
            generateId,
        );
    }
}

export namespace History {
    /**
     * Entry of the history.
     *
     * Each entry has a unique key and a reference to the previous one.
     */
    export interface Entry<Id extends string | number, Value> {
        readonly id: Id;
        readonly previous: Id | undefined;
        readonly value: Value;
    }

    /**
     * Get the key type of the entry.
     */
    export type Key<T extends Entry<string | number, unknown>> = T["id"];

    /**
     * Get the value type of the entry.
     */
    export type Value<T extends Entry<string | number, unknown>> = T["value"];

    /**
     * Generate a new key for the history.
     * @param maxKey The biggest key in the history, or undefined if the history is empty.
     * @returns A new key. It must be bigger than the provided one.
     */
    export type KeyGenerator<Key extends string | number> = (
        maxKey: Key | undefined,
    ) => Key;
}
