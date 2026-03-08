import type { History } from "./history.ts";

interface CacheState<Id extends string | number, Operation> {
    // smallest id received from iterator
    lastId: Id | undefined;

    readonly cache: Map<Id, History.Entry<Id, Operation>>;

    // iterator is finished
    done: boolean;

    readonly iterator: Iterator<History.Entry<Id, Operation>>;
}

const caches = new WeakMap<History<any, any>, CacheState<any, any>>();

/**
 * Find an entry by ID in history.
 *
 * It uses a lazy iterator and caches results to optimize subsequent lookups.
 * @internal
 */
export function lookup<Id extends string | number, Operation>(
    history: History<Id, Operation>,
    id: Id,
): History.Entry<Id, Operation> | undefined {
    let state = caches.get(history);
    if (state === undefined) {
        state = {
            lastId: undefined,
            cache: new Map(),
            done: false,
            iterator: history[Symbol.iterator](),
        };
        caches.set(history, state);
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
