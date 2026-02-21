export interface Item<Id extends string | number> {
    readonly id: Id;
    readonly previous: Id | undefined;
}

export namespace Item {
    export type Key<T extends Item<string | number>> = T["id"];
}
