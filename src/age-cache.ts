import type { Entry } from "./entry.ts";
import type { History } from "./history.ts";

/**
 * @internal
 */
interface CacheState<Key extends string | number> {
    // last key received from iterator
    minId: Key | undefined;
    // every next key will receive `lastAge + 1`
    lastAge: number;

    readonly cache: Map<Key, number>;

    // iterator is finished
    done: boolean;

    readonly iterator: Iterator<Entry<Key, unknown>>;
}

const caches = new WeakMap<History<any, unknown>, CacheState<any>>();

/**
 * @internal
 */
export function ageOf<Key extends string | number>(
    history: History<Key, unknown>,
    id: Key,
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
