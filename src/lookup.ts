import type { History } from "./history.ts";

/**
 * @internal
 */
export interface CachedEntry<Id extends string | number, Operation> {
    entry: History.Entry<Id, Operation>;
    age: number;
}

/**
 * @internal
 */
interface CacheState<Id extends string | number, Operation> {
    // last id received from iterator
    minId: Id | undefined;
    // every next id will receive `lastAge + 1`
    lastAge: number;

    readonly cache: Map<Id, CachedEntry<Id, Operation>>;

    // iterator is finished
    done: boolean;

    readonly iterator: Iterator<History.Entry<Id, Operation>>;
}

const caches = new WeakMap<History<any, any>, CacheState<any, any>>();

/**
 * @internal
 */
export function lookup<Id extends string | number, Operation>(
    history: History<Id, Operation>,
    id: Id,
): CachedEntry<Id, Operation> | undefined {
    let state = caches.get(history);
    if (state === undefined) {
        state = {
            minId: undefined,
            lastAge: 0,
            cache: new Map(),
            done: false,
            iterator: history[Symbol.iterator](),
        };
        caches.set(history, state);
    }

    const cached = state.cache.get(id);
    if (cached !== undefined) return cached;

    if (state.done || (state.minId !== undefined && state.minId < id)) {
        return undefined;
    }

    for (let i = state.iterator.next(); !i.done; i = state.iterator.next()) {
        const age = state.lastAge;
        const entry = i.value;
        const itemId = entry.id;
        state.lastAge++;
        state.minId = itemId;

        const cachedEntry = { entry, age };
        state.cache.set(itemId, cachedEntry);

        if (itemId === id) {
            return cachedEntry;
        }

        if (itemId < id) {
            return undefined;
        }
    }

    state.done = true;
    return undefined;
}
