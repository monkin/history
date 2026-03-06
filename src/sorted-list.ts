/**
 * The list stores values in chunks.
 * If length of the current chunk is greater than CHUNK_SIZE, it will be split into smaller chunks.
 */
const CHUNK_SIZE = 32;

type CompareFunction<T> = (a: T, b: T) => number;

/**
 * Immutable sorted list.
 * Sort function must be provided for every update call.
 * It's expected that the function is not changed across the calls to the same list.
 * If two items are equal, the latest one will replace the older one.
 */
interface SortedList<T> {
    /**
     * Sorted values of this chunk
     */
    items: T[];
    /**
     * Next chunk reference
     */
    next: SortedList<T> | undefined;
}

export const emptyList: SortedList<never> = { items: [], next: undefined };

export const insert = <T>(
    list: SortedList<T>,
    item: T,
    compare: CompareFunction<T>,
) => {};
