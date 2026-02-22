import type { Entry } from "./entry.ts";
import type { List } from "./list";

export class History<T extends Entry<string | number, unknown>> {
    constructor(
        readonly items: List<T>,
        readonly nextId: (maxKey: Entry.Key<T> | undefined) => Entry.Key<T>,
    ) {}
}
