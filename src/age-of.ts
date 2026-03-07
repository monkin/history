import type { History } from "./history.ts";

/**
 * @internal
 */
interface CacheState<Id extends string | number> {
    // last id received from iterator
    minId: Id | undefined;
    // every next id will receive `lastAge + 1`
    lastAge: number;

    readonly cache: Map<Id, number>;

    // iterator is finished
    done: boolean;

    readonly iterator: Iterator<History.Entry<Id, unknown>>;
}

const caches = new WeakMap<History<any, unknown>, CacheState<any>>();

/**
 * @internal
 */
export function ageOf<Id extends string | number>(
    history: History<Id, unknown>,
    id: Id,
): number | undefined {
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
        const itemId = i.value.id;
        state.lastAge++;
        state.minId = itemId;

        state.cache.set(itemId, age);

        if (itemId === id) {
            return age;
        }

        if (itemId < id) {
            return undefined;
        }
    }

    state.done = true;
    return undefined;
}
