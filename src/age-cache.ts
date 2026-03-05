import type { Entry } from "./entry.ts";
import type { History } from "./history.ts";

export class AgeCache<Key extends string | number> {
    // last key received from iterator
    private minId: Key | undefined = undefined;
    // every next key will receive `lastAge + 1`
    private lastAge = 0;

    private readonly cache: Map<Key, number> = new Map();

    // iterator is finished
    private done = false;

    private constructor(
        private readonly iterator: Iterator<Entry<Key, unknown>>,
    ) {}

    get(key: Key): number | undefined {
        const cached = this.cache.get(key);
        if (cached !== undefined) return cached;

        if (this.done || (this.minId !== undefined && this.minId < key)) {
            return undefined;
        }

        for (let i = this.iterator.next(); !i.done; i = this.iterator.next()) {
            const age = this.lastAge;
            const itemId = i.value.id;
            this.lastAge++;
            this.minId = itemId;

            this.cache.set(key, age);

            if (this.minId < key) return undefined;

            if (itemId === key) {
                return age;
            }
        }

        this.done = true;
        return undefined;
    }

    static cache = new WeakMap<History<any, unknown>, AgeCache<any>>();

    static create<K extends string | number>(history: History<K, unknown>) {
        const cached = AgeCache.cache.get(history);
        if (cached !== undefined) return cached;

        const instance = new AgeCache(history[Symbol.iterator]());
        AgeCache.cache.set(history, instance);
        return instance;
    }
}
