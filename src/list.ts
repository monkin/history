import type { Item } from "./item.ts";

const CHUNK_SIZE = 32;

/**
 * Immutable list of items ordered by id.
 * Elements with higher id are placed first.
 * It's implemented as a deque (a single linked list of chunks).
 */
export class List<Id extends string | number, T extends Item<Id>> {
    constructor(
        /**
         * Items sorted by id. Items should not contain more than CHUNK_SIZE elements.
         */
        private readonly items: T[],
        private readonly previous: List<Id, T> | undefined,
    ) {}

    get maxId(): Id | undefined {
        const { items, previous } = this;
        if (items.length) return items[0].id;
        return previous?.maxId;
    }

    isEmpty(): boolean {
        return !this.isNotEmpty();
    }

    isNotEmpty(): boolean {
        const { items, previous } = this;
        return items.length !== 0 || (previous?.isNotEmpty() ?? false);
    }

    has(id: Id): boolean {
        const { maxId, items, previous } = this;
        const l = items.length;
        if (maxId && id > maxId) return false;
        if (!l || id < items[l - 1].id) return previous?.has(id) ?? false;
        return items.some((i) => i.id === id);
    }

    get(id: Id): T | undefined {
        const { maxId, items, previous } = this;
        const l = items.length;
        if (maxId && id > maxId) return undefined;
        if (!l || id < items[l - 1].id) return previous?.get(id);
        return items.find((i) => i.id === id);
    }

    /**
     * Set or replace item by id.
     */
    insert(_value: T): List<Id, T> {
        throw new Error("Not implemented");
    }

    /**
     * Iterate over items starting from the given id.
     * This iteration method skips unreferenced items, it follows the chain of `previous` field references.
     */
    *iterate(startFrom: Id): Generator<T> {
        let lookingFor = startFrom;
        for (const item of this) {
            const { id, previous } = item;
            if (id === lookingFor) yield item;
            if (previous) {
                lookingFor = previous;
            } else {
                break;
            }
        }
    }

    /**
     * Iterate over all items in the list.
     * This method doesn't look at the `previous` field.
     */
    *[Symbol.iterator](): Generator<T> {
        yield* this.items;
        if (this.previous) yield* this.previous;
    }

    isValid(): boolean {
        let prev: T | undefined;
        const ids = new Set<Id>();
        for (const item of this) {
            // ids are sorted
            if (prev && prev.id <= item.id) return false;
            // no references to the future
            if (item.previous && item.id <= item.previous) return false;
            ids.add(item.id);
        }

        // all ids are present
        for (const item of this) {
            if (!ids.has(item.id)) return false;
            if (item.previous && !ids.has(item.previous)) return false;
        }

        // all chunks are not too big
        for (
            let list: List<Id, T> | undefined = this;
            list;
            list = list.previous
        ) {
            if (list.items.length <= CHUNK_SIZE) return false;
        }

        return true;
    }
}
