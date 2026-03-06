/**
 * The list stores values in chunks.
 * If the length of the current chunk is greater than CHUNK_SIZE, it will be split into smaller chunks.
 */
const CHUNK_SIZE = 32;

export const enum CompareResult {
    Less = -1,
    Equal = 0,
    Greater = 1,
}

export type CompareFunction<T> = (a: T, b: T) => CompareResult;
export type LookupFunction<T> = (value: T) => CompareResult;

/**
 * Immutable sorted list.
 * Each next item is greater than the previous one.
 * Sort function must be provided for every update call.
 * It's expected that the function is not changed across the calls to the same list.
 * If two items are equal, the latest one will replace the older one.
 *
 * It's implemented as an interface and set of functions to make it smaller after minification.
 */
export interface SortedList<T> {
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

const create = <T>(items: T[], next?: SortedList<T>): SortedList<T> =>
    items.length
        ? split({
              items,
              next,
          })
        : next
          ? next
          : emptyList;

const split = <T>(list: SortedList<T>): SortedList<T> => {
    const { items, next } = list;
    const l = items.length;
    if (l <= CHUNK_SIZE) return list;
    const middle = l >> 1;
    return create(items.slice(0, middle), create(items.slice(middle), next));
};

export const each = <T>(
    list: SortedList<T>,
    callback: (item: T, i: number) => void,
): void => {
    let counter = 0;
    for (
        let current: SortedList<T> | undefined = list;
        current;
        current = current.next
    ) {
        const { items } = current;
        const l = items.length;
        for (let i = 0; i < l; i++) {
            callback(items[i], counter);
            counter++;
        }
    }
};

export function* iterate<T>(list: SortedList<T>): IterableIterator<T> {
    let current: SortedList<T> | undefined = list;
    while (current) {
        yield* current.items;
        current = current.next;
    }
}

export const toArray = <T>(list: SortedList<T>): T[] => {
    const result: T[] = [];
    each(list, (item) => result.push(item));
    return result;
};

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
            return create([...items, item]);
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
    let low = 1,
        high = l - 2;
    while (low <= high) {
        const mid = (low + high) >> 1;
        const cmp = compare(item, items[mid]);
        if (cmp === CompareResult.Equal) {
            return items[mid] === item
                ? list
                : create(
                      [...items.slice(0, mid), item, ...items.slice(mid + 1)],
                      next,
                  );
        }
        if (cmp === CompareResult.Greater) low = mid + 1;
        else high = mid - 1;
    }

    return create([...items.slice(0, low), item, ...items.slice(low)], next);
};

const insertAllSorted = <T>(
    list: SortedList<T>,
    values: T[],
    compare: CompareFunction<T>,
): SortedList<T> => {
    if (values.length === 0) return list;
    if (values.length === 1) return insert(list, values[0], compare);

    const { items, next } = list;
    const l = items.length;

    if (l === 0) {
        return next ? insertAllSorted(next, values, compare) : create(values);
    }

    const first = items[0];
    const last = items[l - 1];

    if (compare(values[values.length - 1], first) === CompareResult.Less) {
        return create(values, list);
    }

    if (compare(values[0], last) === CompareResult.Greater) {
        if (next) {
            const updated = insertAllSorted(next, values, compare);
            return updated === next ? list : create(items, updated);
        } else {
            return create([...items, ...values]);
        }
    }

    const smaller: T[] = [];
    const inside: T[] = [];
    const larger: T[] = [];

    for (const value of values) {
        if (compare(value, first) === CompareResult.Less) {
            smaller.push(value);
        } else if (compare(value, last) === CompareResult.Greater) {
            larger.push(value);
        } else {
            inside.push(value);
        }
    }

    if (inside.length === 0) {
        return insertAllSorted(
            insertAllSorted(list, smaller, compare),
            larger,
            compare,
        );
    }

    const newItems: T[] = [];
    let i = 0;
    let j = 0;
    while (i < items.length || j < inside.length) {
        if (i < items.length && j < inside.length) {
            const cmp = compare(inside[j], items[i]);
            if (cmp === CompareResult.Less) {
                newItems.push(inside[j]);
                j++;
            } else if (cmp === CompareResult.Equal) {
                newItems.push(inside[j]);
                i++;
                j++;
            } else {
                newItems.push(items[i]);
                i++;
            }
        } else if (i < items.length) {
            newItems.push(items[i]);
            i++;
        } else {
            newItems.push(inside[j]);
            j++;
        }
    }

    if (
        newItems.length === items.length &&
        newItems.every((v, idx) => items[idx] === v)
    ) {
        return insertAllSorted(
            insertAllSorted(list, smaller, compare),
            larger,
            compare,
        );
    }

    return insertAllSorted(
        insertAllSorted(create(newItems, next), smaller, compare),
        larger,
        compare,
    );
};

export const insertAll = <T>(
    list: SortedList<T>,
    values: T[],
    compare: CompareFunction<T>,
): SortedList<T> => {
    if (values.length === 0) return list;

    const sorted = [...values].sort(compare);
    const uniqueSorted: T[] = [];
    for (const val of sorted) {
        if (
            uniqueSorted.length > 0 &&
            compare(val, uniqueSorted[uniqueSorted.length - 1]) ===
                CompareResult.Equal
        ) {
            uniqueSorted[uniqueSorted.length - 1] = val;
        } else {
            uniqueSorted.push(val);
        }
    }
    return insertAllSorted(list, uniqueSorted, compare);
};

export const filter = <T>(
    list: SortedList<T>,
    predicate: (item: T) => boolean,
): SortedList<T> => {
    const { items, next } = list;
    const filteredItems = items.filter(predicate);
    const filteredNext = next ? filter(next, predicate) : undefined;

    return filteredItems.length === items.length && filteredNext === next
        ? list
        : create(filteredItems, filteredNext);
};

export const getItem = <T>(
    list: SortedList<T>,
    lookup: LookupFunction<T>,
): T | undefined => {
    for (
        let current: SortedList<T> | undefined = list;
        current;
        current = current.next
    ) {
        const { items } = current;

        const l = items.length;
        if (l === 0) {
            continue;
        }

        const first = items[0];
        const cmpFirst = lookup(first);
        if (cmpFirst === CompareResult.Equal) return first;
        if (cmpFirst === CompareResult.Less) return undefined;

        const last = items[l - 1];
        const cmpLast = lookup(last);
        if (cmpLast === CompareResult.Equal) return last;
        if (cmpLast === CompareResult.Greater) {
            continue;
        }

        // Binary search in items[1...l-2]
        let low = 1;
        let high = l - 2;
        while (low <= high) {
            const mid = (low + high) >> 1;
            const item = items[mid];
            const cmp = lookup(item);
            if (cmp === CompareResult.Equal) return item;
            if (cmp === CompareResult.Greater) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return undefined;
    }
    return undefined;
};

export const hasItem = <T>(
    list: SortedList<T>,
    lookup: LookupFunction<T>,
): boolean => getItem(list, lookup) !== undefined;

export const remove = <T>(
    list: SortedList<T>,
    lookup: LookupFunction<T>,
): SortedList<T> => {
    const { items, next } = list;
    const l = items.length;
    if (l === 0) {
        return next ? remove(next, lookup) : list;
    }

    const first = items[0];
    const cmpFirst = lookup(first);
    if (cmpFirst === CompareResult.Equal) {
        return create(items.slice(1), next);
    }
    if (cmpFirst === CompareResult.Less) {
        return list;
    }

    const last = items[l - 1];
    const cmpLast = lookup(last);
    if (cmpLast === CompareResult.Equal) {
        return create(items.slice(0, l - 1), next);
    }
    if (cmpLast === CompareResult.Greater) {
        if (next) {
            const newNext = remove(next, lookup);
            return newNext === next ? list : create(items, newNext);
        }
        return list;
    }

    // Binary search in items[1...l-2]
    let low = 1;
    let high = l - 2;
    while (low <= high) {
        const mid = (low + high) >> 1;
        const item = items[mid];
        const cmp = lookup(item);
        if (cmp === CompareResult.Equal) {
            return create(
                [...items.slice(0, mid), ...items.slice(mid + 1)],
                next,
            );
        }
        if (cmp === CompareResult.Greater) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return list;
};
