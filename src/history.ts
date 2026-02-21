import type { Item } from "./item";
import type { List } from "./list";

export class History<T extends Item<string | number>> {
    constructor(readonly items: List<T>) {}
}
