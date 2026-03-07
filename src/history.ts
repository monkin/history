import { ageOf } from "./age-of.ts";
import {
    Comparison,
    emptyList,
    getItem,
    insert,
    insertAll,
    iterate,
    type SortedList,
} from "./sorted-list";

/**
 * Read-only history of operations.
 *
 * It contains a linked list of operations with references to the previous one.
 * Operation can be added to the history but cannot be removed.
 *
 * Undo/redo are implemented by moving the `current` operation pointer.
 *
 * For one-click actions everything is straight forward. Continuous actions
 * (resizing while mouse moving, for example) should be stored outside until the
 * operation is finished ('mouseup' in case of resizing).
 */
export class History<Id extends string | number, Operation> {
    /** @internal */
    constructor(
        /** @internal */
        readonly items: SortedList<History.Entry<Id, Operation>>,
        /**
         * Pointer to the current entry in the history.
         * It can be moved by undo/redo.
         */
        readonly current: Id | undefined,
        /**
         * Function to generate a new unique id for an entry.
         * It receives the biggest Id in the history if any.
         * The generated id should be bigger than the provided one.
         */
        readonly generateId: History.IdGenerator<Id>,
    ) {}

    /**
     * @internal
     */
    private get maxId(): Id | undefined {
        return this.items.items[0]?.id;
    }

    get(id: Id): History.Entry<Id, Operation> | undefined {
        return getItem(this.items, lookupById(id));
    }

    /**
     * Calculates the age position of an element identified by the given id within a collection.
     * The method iterates through the collection, compares ids, and determines the position if found.
     * `undefined` means that the id is not present in the collection or was undone.
     */
    ageOf(id: Id): number | undefined {
        return ageOf(this, id);
    }

    /**
     * Upload a list of items to the history.
     * This operation should be used for partial history loading.
     * It won't change `current`, since it uploads older item.
     */
    upload(items: History.Entry<Id, Operation>[]): History<Id, Operation> {
        return new History(
            insertAll(this.items, items, compareEntries),
            this.current,
            this.generateId,
        );
    }

    get canUndo(): boolean {
        return this.current !== undefined;
    }

    get canRedo(): boolean {
        return this.maxId !== this.current;
    }

    /**
     * Add a new operation to the history.
     */
    add(operation: Operation): History<Id, Operation> {
        const { items, current, generateId, maxId } = this;

        const id = generateId(maxId);
        return new History(
            insert(items, { id, operation, previous: current }, compareEntries),
            id,
            generateId,
        );
    }

    undo(): History<Id, Operation> {
        const { items, current, generateId } = this;

        if (current === undefined) return this;

        return new History(
            items,
            current && getItem(items, lookupById(current))?.previous,
            generateId,
        );
    }

    redo(): History<Id, Operation> {
        const { items, current, generateId, maxId } = this;

        if (current === maxId || maxId === undefined) return this;

        for (const item of this.iterate(maxId)) {
            if (item.previous === current) {
                return new History(items, item.id, generateId);
            }
        }

        return this;
    }

    /**
     * Retrieves a generator that yields all (undone too) items in the history.
     */
    *all(): Generator<History.Entry<Id, Operation>> {
        return yield* iterate(this.items);
    }

    /**
     * Iterate over history. Undone operations are skipped.
     *
     * To iterate over all operations, use `for (const item of history.all()) { ... }` instead.
     */
    [Symbol.iterator](): Generator<History.Entry<Id, Operation>> {
        return this.iterate(this.current);
    }

    private *iterate(
        startFrom: Id | undefined,
    ): Generator<History.Entry<Id, Operation>> {
        if (startFrom === undefined) return;

        let lookingFor: Id | undefined = startFrom;
        for (const item of iterate(this.items)) {
            const { id, previous } = item;
            if (id === lookingFor) {
                yield item;
                if (previous !== undefined) {
                    lookingFor = previous;
                } else {
                    break;
                }
            } else if (id < lookingFor) {
                break;
            }
        }
    }

    static empty<Id extends string | number, Operation>(
        generateId: History.IdGenerator<Id>,
    ): History<Id, Operation> {
        return new History(emptyList, undefined, generateId);
    }

    static fromItems<Id extends string | number, Operation>(
        current: Id | undefined,
        items: History.Entry<Id, Operation>[],
        generateId: History.IdGenerator<Id>,
    ): History<Id, Operation> {
        return new History(
            insertAll(emptyList, items, compareEntries),
            current,
            generateId,
        );
    }
}

const compareEntries = (
    a: History.Entry<any, any>,
    b: History.Entry<any, any>,
): Comparison => {
    if (a.id < b.id) return Comparison.Greater;
    if (a.id > b.id) return Comparison.Less;
    return Comparison.Equal;
};

const lookupById =
    <Id extends string | number>(id: Id) =>
    (entry: History.Entry<Id, unknown>): Comparison => {
        if (id < entry.id) return Comparison.Greater;
        if (id > entry.id) return Comparison.Less;
        return Comparison.Equal;
    };

export namespace History {
    /**
     * Entry of the history.
     *
     * Each entry has a unique id and a reference to the previous one.
     */
    export interface Entry<Id extends string | number, Operation> {
        readonly id: Id;
        readonly previous: Id | undefined;
        readonly operation: Operation;
    }

    /**
     * Get the id type of the entry.
     */
    export type Id<T extends Entry<string | number, unknown>> = T["id"];

    /**
     * Get the operation type of the entry.
     */
    export type Operation<T extends Entry<string | number, unknown>> =
        T["operation"];

    /**
     * Generate a new id for the history.
     * @param maxId The biggest id in the history, or undefined if the history is empty.
     * @returns A new id. It must be bigger than the provided one.
     */
    export type IdGenerator<Id extends string | number> = (
        maxId: Id | undefined,
    ) => Id;
}
