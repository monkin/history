export interface Entry<Id extends string | number, Value> {
    readonly id: Id;
    readonly previous: Id | undefined;
    readonly value: Value;
}

export namespace Entry {
    export type Key<T extends Entry<string | number, unknown>> = T["id"];
    export type Value<T extends Entry<string | number, unknown>> = T["value"];
    export type KeyGenerator<T extends Entry<string | number, unknown>> = (
        maxKey: Key<T> | undefined,
    ) => Key<T>;
}
