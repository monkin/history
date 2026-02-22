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
}
