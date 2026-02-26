import type { List } from "./list";

export class History<T extends History.Entry<string | number, unknown>> {
    constructor(
        readonly items: List<T>,
        /**
         * Pointer to the current entry in the history.
         * It can be moved by undo/redo operations.
         */
        readonly current: History.Key<T> | undefined,
        /**
         * Function to generate a new unique key for an entry.
         * It receives the biggest Id in the history if any.
         * The generated key should be bigger than the provided one.
         */
        readonly generateId: History.KeyGenerator<T>,
    ) {}

    get canUndo(): boolean {
        return this.current !== undefined;
    }

    get canRedo(): boolean {
        return this.items.maxId !== this.current;
    }

    undo(): History<T> {
        const { items, current } = this;

        if (current === undefined) return this;

        return new History(
            items,
            current && items.get(current)?.previous,
            this.generateId,
        );
    }

    redo(): History<T> {
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

    [Symbol.iterator](): Generator<T> {
        return this.items.iterate(this.current);
    }
}

export namespace History {
    export interface Entry<Id extends string | number, Value> {
        readonly id: Id;
        readonly previous: Id | undefined;
        readonly value: Value;
    }

    export type Key<T extends Entry<string | number, unknown>> = T["id"];
    export type Value<T extends Entry<string | number, unknown>> = T["value"];

    export type KeyGenerator<T extends Entry<string | number, unknown>> = (
        maxKey: Key<T> | undefined,
    ) => Key<T>;
}
