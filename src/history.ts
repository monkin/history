import type { Entry } from "./entry.ts";
import type { List } from "./list";

export class History<T extends Entry<string | number, any>> {
    constructor(readonly items: List<T>) {}
}
