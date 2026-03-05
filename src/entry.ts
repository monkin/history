/**
 * Entry of the history.
 *
 * Each entry has a unique key and a reference to the previous one.
 */
export interface Entry<Id extends string | number, Operation> {
    readonly id: Id;
    readonly previous: Id | undefined;
    readonly operation: Operation;
}

/**
 * Get the key type of the entry.
 */
export type Key<T extends Entry<string | number, unknown>> = T["id"];

/**
 * Get the value type of the entry.
 */
export type Value<T extends Entry<string | number, unknown>> =
    T["operation"];

/**
 * Generate a new key for the history.
 * @param maxKey The biggest key in the history, or undefined if the history is empty.
 * @returns A new key. It must be bigger than the provided one.
 */
export type KeyGenerator<Key extends string | number> = (
    maxKey: Key | undefined,
) => Key;
