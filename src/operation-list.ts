import { lookup } from "./lookup.ts";
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
 * Read-only operation list of operations.
 *
 * It contains a linked list of operations with references to the previous one.
 * Operation can be added to the operation list but cannot be removed.
 *
 * Undo/redo are implemented by moving the `current` operation pointer.
 *
 * For one-click actions everything is straight forward. Continuous actions
 * (resizing while mouse moving, for example) should be stored outside until the
 * operation is finished ('mouseup' in case of resizing).
 */
export class OperationList<Id extends string | number, Operation> {
    /** @internal */
    constructor(
        /** @internal */
        readonly items: SortedList<OperationList.Entry<Id, Operation>>,
        /**
         * Pointer to the current entry in the operation list.
         * It can be moved by undo/redo.
         *
         * @internal
         */
        readonly current: Id | undefined,
        /**
         * Function to generate a new unique id for an entry.
         * It receives the biggest Id in the operation list if any.
         * The generated id should be bigger than the provided one.
         *
         * @internal
         */
        readonly generateId: OperationList.IdGenerator<Id>,
    ) {}

    /**
     * @internal
     */
    private get maxId(): Id | undefined {
        return this.items.items[0]?.id;
    }

    /**
     * Get the entry with the given id if it's reachable from the current state.
     * If the item is undone and not present in the current branch returns undefined.
     */
    get(id: Id): OperationList.Entry<Id, Operation> | undefined {
        return lookup(this, id);
    }

    /**
     * Checks if an entry with the specified ID exists.
     * If the item is undone and not present in the current branch returns false.
     */
    has(id: Id): boolean {
        return this.get(id) !== undefined;
    }

    isUndone(id: Id): boolean {
        return !this.has(id) && this.entry(id) !== undefined;
    }

    /**
     * Get the entry with the given id, even if it's undone.
     */
    entry(id: Id): OperationList.Entry<Id, Operation> | undefined {
        return getItem(this.items, lookupById(id));
    }

    /**
     * Calculates the age position of an element identified by the given id within a collection.
     * The method iterates through the collection, compares ids, and determines the position if found.
     * `undefined` means that the id is not present in the collection or was undone.
     */
    ageOf(id: Id): number | undefined {
        const { current } = this;
        if (current === undefined) return undefined;
        if (id === current) return 0;

        const currentEntry = this.get(current);
        const oldEntry = this.get(id);

        return currentEntry && oldEntry
            ? currentEntry.generation - oldEntry.generation
            : undefined;
    }

    /**
     * Upload a list of items to the operation list.
     * This operation should be used for partial operation list loading.
     * It won't change `current`, since it uploads older item.
     */
    upload(items: OperationList.Entry<Id, Operation>[]): OperationList<Id, Operation> {
        return new OperationList(
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
     * Add a new operation to the operation list.
     */
    add(operation: Operation): OperationList<Id, Operation> {
        const { items, current, generateId, maxId } = this;

        const id = generateId(maxId);
        const generation =
            current !== undefined
                ? (this.get(current)?.generation ?? 0) + 1
                : 0;
        return new OperationList(
            insert(
                items,
                { id, operation, previous: current, generation },
                compareEntries,
            ),
            id,
            generateId,
        );
    }

    undo(): OperationList<Id, Operation> {
        const { items, current, generateId } = this;

        if (current === undefined) return this;

        return new OperationList(
            items,
            current && getItem(items, lookupById(current))?.previous,
            generateId,
        );
    }

    redo(): OperationList<Id, Operation> {
        const { items, current, generateId, maxId } = this;

        if (current === maxId || maxId === undefined) return this;

        for (const item of this.iterate(maxId)) {
            if (item.previous === current) {
                return new OperationList(items, item.id, generateId);
            }
        }

        return this;
    }

    /**
     * Retrieves a generator that yields all (including undone) entries in the operation list.
     */
    *entries(): Generator<OperationList.Entry<Id, Operation>> {
        return yield* iterate(this.items);
    }

    /**
     * Iterate over operation list. Undone operations are skipped.
     *
     * To iterate over all operations, use `for (const item of operationList.entries()) { ... }` instead.
     */
    [Symbol.iterator](): Generator<OperationList.Entry<Id, Operation>> {
        return this.iterate(this.current);
    }

    private *iterate(
        startFrom: Id | undefined,
    ): Generator<OperationList.Entry<Id, Operation>> {
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
        generateId: OperationList.IdGenerator<Id>,
    ): OperationList<Id, Operation> {
        return new OperationList(emptyList, undefined, generateId);
    }

    static fromItems<Id extends string | number, Operation>(
        current: Id | undefined,
        items: OperationList.Entry<Id, Operation>[],
        generateId: OperationList.IdGenerator<Id>,
    ): OperationList<Id, Operation> {
        return new OperationList(
            insertAll(emptyList, items, compareEntries),
            current,
            generateId,
        );
    }
}

const compareEntries = (
    a: OperationList.Entry<any, any>,
    b: OperationList.Entry<any, any>,
): Comparison => {
    if (a.id < b.id) return Comparison.Greater;
    if (a.id > b.id) return Comparison.Less;
    return Comparison.Equal;
};

const lookupById =
    <Id extends string | number>(id: Id) =>
    (entry: OperationList.Entry<Id, unknown>): Comparison => {
        if (id < entry.id) return Comparison.Greater;
        if (id > entry.id) return Comparison.Less;
        return Comparison.Equal;
    };

export namespace OperationList {
    /**
     * Entry of the operation list.
     *
     * Each entry has a unique id and a reference to the previous one.
     */
    export interface Entry<Id extends string | number, Operation> {
        readonly id: Id;
        readonly previous: Id | undefined;
        readonly generation: number;
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
     * Generate a new id for the operation list.
     * @param maxId The biggest id in the operation list, or undefined if the operation list is empty.
     * @returns A new id. It must be bigger than the provided one.
     */
    export type IdGenerator<Id extends string | number> = (
        maxId: Id | undefined,
    ) => Id;
}
