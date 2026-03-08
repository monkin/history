interface CacheState<Id extends string | number, T extends { id: Id }> {
    // smallest id received from iterator
    lastId: Id | undefined;

    readonly cache: Map<Id, T>;

    // iterator is finished
    done: boolean;

    readonly iterator: Iterator<T>;
}

const caches = new WeakMap<object, CacheState<any, any>>();

/**
 * Find an entry by ID in source.
 *
 * It uses a lazy iterator and caches results to optimize subsequent lookups.
 * @internal
 */
export function lookup<Id extends string | number, T extends { id: Id }>(
    source: Iterable<T> & object,
    id: Id,
): T | undefined {
    let state = caches.get(source);
    if (state === undefined) {
        state = {
            lastId: undefined,
            cache: new Map(),
            done: false,
            iterator: source[Symbol.iterator](),
        };
        caches.set(source, state);
    }

    const cached = state.cache.get(id);
    if (cached !== undefined) return cached;

    if (state.done || (state.lastId !== undefined && state.lastId < id)) {
        return undefined;
    }

    for (let i = state.iterator.next(); !i.done; i = state.iterator.next()) {
        const entry = i.value;
        const itemId = entry.id;
        state.lastId = itemId;

        state.cache.set(itemId, entry);

        if (itemId === id) {
            return entry;
        }

        if (itemId < id) {
            return undefined;
        }
    }

    state.done = true;
    return undefined;
}
