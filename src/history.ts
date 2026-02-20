import type { Item } from "./item";
import type { List } from "./list";

export class History<Id extends string | number, T extends Item<Id>> {
    constructor(readonly items: List<Id, T>) {}
}
