import type { List } from "./list";

export class History<Key extends string | number, Operation> {
    constructor(
        readonly items: List<History.Entry<Key, Operation>>,
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

    get canUndo(): boolean {
        return this.current !== undefined;
    }

    get canRedo(): boolean {
        return this.items.maxId !== this.current;
    }

    add(operation: Operation): History<Key, Operation> {
        const { items, current, generateId } = this;
        const id = generateId(items.maxId);
        return new History(
            items.insert({ id, operation, previous: current }),
            id,
            generateId,
        );
    }

    /**
     * Replace the active operation.
     *
     * It works for continuous operations. Each time a new input is received,
     * the previous operation should be replaced.
     */
    update(operation: Operation): History<Key, Operation> {
        const { items, current } = this;
        if (!current) return this;

        const previous = items.get(current)?.previous;
        return new History(
            items.insert({ id: current, operation: operation, previous }),
            current,
            this.generateId,
        );
    }

    /**
     * Remove the active operation.
     */
    rollback() {
        const { items, current } = this;
        if (!current) return this;

        const previous = items.get(current)?.previous;
        return new History(items, previous, this.generateId);
    }

    undo(): History<Key, Operation> {
        const { items, current } = this;

        if (current === undefined) return this;

        return new History(
            items,
            current && items.get(current)?.previous,
            this.generateId,
        );
    }

    redo(): History<Key, Operation> {
        const { items, current } = this;
        const { maxId } = items;

        if (current === maxId || maxId === undefined) return this;

        for (const item of items.iterate(maxId)) {
            if (item.previous === current) {
                return new History(items, item.id, this.generateId);
            }
        }

        return this;
    }

    [Symbol.iterator](): Generator<History.Entry<Key, Operation>> {
        return this.items.iterate(this.current);
    }
}

export namespace History {
    export interface Entry<Id extends string | number, Operation> {
        readonly id: Id;
        readonly previous: Id | undefined;
        readonly operation: Operation;
    }

    export type Key<T extends Entry<string | number, unknown>> = T["id"];
    export type Value<T extends Entry<string | number, unknown>> =
        T["operation"];

    export type KeyGenerator<Key extends string | number> = (
        maxKey: Key | undefined,
    ) => Key;
}
