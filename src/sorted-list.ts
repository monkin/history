/**
 * The list stores values in chunks.
 * If the length of the current chunk is greater than CHUNK_SIZE, it will be split into smaller chunks.
 */
const CHUNK_SIZE = 32;

/**
 * @internal
 */
export const enum Comparison {
    Less = -1,
    Equal = 0,
    Greater = 1,
}

export type CompareFunction<T> = (a: T, b: T) => Comparison;
export type LookupFunction<T> = (value: T) => Comparison;

/**
 * Immutable sorted list.
 * Each next item is greater than the previous one.
 * Sort function must be provided for every update call.
 * It's expected that the function is not changed across the calls to the same list.
 * If two items are equal, the latest one will replace the older one.
 *
 * It's implemented as an interface and set of functions to make it smaller after minification.
 *
 * @internal
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
    if (compareFirst === Comparison.Less) {
        return items.length < CHUNK_SIZE
            ? create([item, ...items], next)
            : create([item], list);
    }

    // replacing the first item
    if (compareFirst === Comparison.Equal) {
        return first === item ? list : create([item, ...items.slice(1)], next);
    }

    const last = items[l - 1];
    const compareLast = compare(item, last);
    // the item is behind the last item in the current chunk
    if (compareLast === Comparison.Greater) {
        if (next) {
            const newNext = insert(next, item, compare);
            return newNext === next ? list : create(items, newNext);
        } else {
            return create([...items, item]);
        }
    }

    // replacing the last item
    if (compareLast === Comparison.Equal) {
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
        if (cmp === Comparison.Equal) {
            return items[mid] === item
                ? list
                : create(
                      [...items.slice(0, mid), item, ...items.slice(mid + 1)],
                      next,
                  );
        }
        if (cmp === Comparison.Greater) low = mid + 1;
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

    if (compare(values[values.length - 1], first) === Comparison.Less) {
        return create(values, list);
    }

    if (compare(values[0], last) === Comparison.Greater) {
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
        if (compare(value, first) === Comparison.Less) {
            smaller.push(value);
        } else if (compare(value, last) === Comparison.Greater) {
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
            if (cmp === Comparison.Less) {
                newItems.push(inside[j]);
                j++;
            } else if (cmp === Comparison.Equal) {
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
                Comparison.Equal
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
        if (cmpFirst === Comparison.Equal) return first;
        if (cmpFirst === Comparison.Less) return undefined;

        const last = items[l - 1];
        const cmpLast = lookup(last);
        if (cmpLast === Comparison.Equal) return last;
        if (cmpLast === Comparison.Greater) {
            continue;
        }

        // Binary search in items[1...l-2]
        let low = 1;
        let high = l - 2;
        while (low <= high) {
            const mid = (low + high) >> 1;
            const item = items[mid];
            const cmp = lookup(item);
            if (cmp === Comparison.Equal) return item;
            if (cmp === Comparison.Greater) {
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
    if (cmpFirst === Comparison.Equal) {
        return create(items.slice(1), next);
    }
    if (cmpFirst === Comparison.Less) {
        return list;
    }

    const last = items[l - 1];
    const cmpLast = lookup(last);
    if (cmpLast === Comparison.Equal) {
        return create(items.slice(0, l - 1), next);
    }
    if (cmpLast === Comparison.Greater) {
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
        if (cmp === Comparison.Equal) {
            return create(
                [...items.slice(0, mid), ...items.slice(mid + 1)],
                next,
            );
        }
        if (cmp === Comparison.Greater) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return list;
};

export const diff = <T>(
    before: SortedList<T>,
    after: SortedList<T>,
    compare: CompareFunction<T>,
): [T | undefined, T | undefined][] => {
    const result: [T | undefined, T | undefined][] = [];

    let currentBefore: SortedList<T> | undefined = before;
    let currentAfter: SortedList<T> | undefined = after;
    let indexBefore = 0;
    let indexAfter = 0;

    while (currentBefore || currentAfter) {
        if (currentBefore === currentAfter && indexBefore === indexAfter) {
            break;
        }

        const itemsBefore = currentBefore?.items;
        const itemsAfter = currentAfter?.items;

        const hasBefore = !!itemsBefore && indexBefore < itemsBefore.length;
        const hasAfter = !!itemsAfter && indexAfter < itemsAfter.length;

        if (hasBefore && hasAfter) {
            const itemBefore = itemsBefore[indexBefore];
            const itemAfter = itemsAfter[indexAfter];
            const cmp = compare(itemBefore, itemAfter);
            if (cmp === Comparison.Equal) {
                if (itemBefore !== itemAfter) {
                    result.push([itemBefore, itemAfter]);
                }
                indexBefore++;
                indexAfter++;
            } else if (cmp === Comparison.Less) {
                result.push([itemBefore, undefined]);
                indexBefore++;
            } else {
                result.push([undefined, itemAfter]);
                indexAfter++;
            }
        } else if (hasBefore) {
            result.push([itemsBefore[indexBefore], undefined]);
            indexBefore++;
        } else if (hasAfter) {
            result.push([undefined, itemsAfter[indexAfter]]);
            indexAfter++;
        }

        let moved = false;
        if (currentBefore && indexBefore >= (itemsBefore?.length ?? 0)) {
            currentBefore = currentBefore.next;
            indexBefore = 0;
            moved = true;
        }
        if (currentAfter && indexAfter >= (itemsAfter?.length ?? 0)) {
            currentAfter = currentAfter.next;
            indexAfter = 0;
            moved = true;
        }

        if (!moved && !hasBefore && !hasAfter) {
            break;
        }
    }

    return result;
};
