import type { Entry } from "./entry.ts";
import type { List } from "./list";

export class History<T extends Entry<string | number, unknown>> {
    constructor(readonly items: List<T>) {}
}
