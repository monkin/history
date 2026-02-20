export interface Item<Id extends string | number> {
    readonly id: Id;
    readonly previous: Id | undefined;
}
