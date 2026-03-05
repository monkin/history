import { AgeCache } from "./age-cache.ts";
import type { Entry, KeyGenerator } from "./entry";
import { List } from "./list";

/**
 * Read-only history of values.
 *
 * It contains a linked list of values with references to the previous one.
 * Value can be added to the history, but cannot be removed.
 *
 * Undo/redo are implemented by moving the `current` value pointer.
 *
 * For one-click actions everything a straight forward. Continuous actions
 * (resizing while mouse moving, for example) should be stored outside until the
 * value is finished ('mouseup' in case of resizing).
 */
export class History<Key extends string | number, Operation> {
    /** @internal */
    constructor(
        /** @internal */
        readonly items: List<Entry<Key, Operation>>,
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
        readonly generateId: KeyGenerator<Key>,
    ) {}

    /**
     * Calculates the age position of an element identified by the given id within a collection.
     * The method iterates through the collection, compares ids, and determines the position if found.
     * `undefined` means that the id is not present in the collection or was undone.
     */
    ageOf(id: Key): number | undefined {
        return AgeCache.get(this).get(id);
    }

    /**
     * Upload a list of items to the history.
     * This value should be used for partial history loading.
     * It won't change `current`, since it uploads older item.
     */
    upload(items: Entry<Key, Operation>[]): History<Key, Operation> {
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
    *all(): Generator<Entry<Key, Operation>> {
        return yield* this.items;
    }

    /**
     * Iterate over history. Undone values are skipped.
     *
     * To iterate over all values, use `for (const item of history.all()) { ... }` instead.
     */
    [Symbol.iterator](): Generator<Entry<Key, Operation>> {
        return this.items.iterate(this.current);
    }

    static empty<Key extends string | number, Value>(
        generateId: KeyGenerator<Key>,
    ): History<Key, Value> {
        return new History(new List([], undefined), undefined, generateId);
    }

    static fromItems<Key extends string | number, Value>(
        current: Key | undefined,
        items: Entry<Key, Value>[],
        generateId: KeyGenerator<Key>,
    ): History<Key, Value> {
        return new History(
            new List<Entry<Key, Value>>([], undefined).insertAll(items),
            current,
            generateId,
        );
    }
}
