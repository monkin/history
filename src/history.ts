import type { Entry } from "./entry.ts";
import type { List } from "./list";

export class History<T extends Entry<string | number, unknown>> {
    constructor(
        readonly items: List<T>,
        /**
         * Pointer to the current entry in the history.
         * It can be moved by undo/redo operations.
         */
        readonly current: Entry.Key<T> | undefined,
        /**
         * Function to generate a new unique key for an entry.
         * It receives the biggest Id in the history if any.
         * The generated key should be bigger than the provided one.
         */
        readonly generateId: Entry.KeyGenerator<T>,
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
}
