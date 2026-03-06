/**
 * The list stores values in chunks.
 * If length of the current chunk is greater than CHUNK_SIZE, it will be split into smaller chunks.
 */
const CHUNK_SIZE = 32;

export const enum CompareResult {
    Less = -1,
    Equal = 0,
    Greater = 1,
}

type CompareFunction<T> = (a: T, b: T) => CompareResult;

/**
 * Immutable sorted list.
 * Each next item is greater than the previous one.
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

const create = <T>(items: T[], next?: SortedList<T>): SortedList<T> => ({
    items,
    next,
});

const split = <T>(list: SortedList<T>): SortedList<T> => {
    const { items, next } = list;
    const l = items.length;
    if (l <= CHUNK_SIZE) return list;
    const midle = l >> 1;
    return split(
        create(items.slice(0, midle), split(create(items.slice(midle), next))),
    );
};

const getFirst = <T>(list: SortedList<T>): T | undefined => list.items[0];
const getLast = <T>(list: SortedList<T>): T | undefined =>
    list.items[list.items.length - 1];

export const insert = <T>(
    list: SortedList<T>,
    item: T,
    compare: CompareFunction<T>,
): SortedList<T> => {
    const { items, next } = list;
    const l = items.length;
    if (l === 0) {
        return next ? insert(next, item, compare) : create([item], undefined);
    }

    const first = items[0];
    const compareFirst = compare(item, first);
    // the item is before the first item in the current chunk
    if (compareFirst === CompareResult.Less) {
        return items.length < CHUNK_SIZE
            ? create([item, ...items], next)
            : create([item], list);
    }

    // replacing the first item
    if (compareFirst === CompareResult.Equal) {
        return first === item ? list : create([item, ...items.slice(1)], next);
    }

    const last = items[l - 1];
    const compareLast = compare(item, last);
    // the item is behind the last item in the current chunk
    if (compareLast === CompareResult.Greater) {
        if (next) {
            const newNext = insert(next, item, compare);
            return newNext === next ? list : create(items, newNext);
        } else {
            return split(create([...items, item]));
        }
    }

    // replacing the last item
    if (compareLast === CompareResult.Equal) {
        if (last === item) {
            return list;
        } else {
            const newItems = items.slice(0, l - 1);
            newItems.push(item);
            return create(newItems, next);
        }
    }

    // inserting the item between the first and the last item
};
