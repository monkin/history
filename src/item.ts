export interface Item<Id extends string | number> {
    id: Id;
    previous: Id | undefined;
}
