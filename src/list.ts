import type { Item } from "./item.ts";

const CHUNK_SIZE = 32;

/**
 * Immutable list of items ordered by id.
 * Elements with higher id are placed first.
 * It's implemented as a deque (a single linked list of chunks).
 */
export class List<Id extends string | number, T extends Item<Id>> {
    private readonly items: T[];
    private readonly previous: List<Id, T> | undefined;
    constructor(
        /**
         * Items sorted by id. Items should not contain more than CHUNK_SIZE elements.
         */
        items: T[],
        previous: List<Id, T> | undefined,
    ) {
        this.items = items;
        this.previous = previous;
    }

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

        // this id probably was added later
        if (maxId && id > maxId) return undefined;

        // id is smaller than the smallest in the current chunk
        if (!l || id < items[l - 1].id) return previous?.get(id);

        // it should be present in the current chunk
        return items.find((i) => i.id === id);
    }

    insert(value: T): List<Id, T> {
        const { items, previous } = this;
        const id = value.id;
        const l = items.length;

        if (l === 0) {
            return previous?.insert(value) ?? new List([value], undefined);
        }

        const latestId = items[0].id;
        const earliestId = items[l - 1].id;

        if (id > latestId) {
            if (l === CHUNK_SIZE) {
                return new List([value], this);
            } else {
                return new List([value, ...items], previous);
            }
        }

        if (id < earliestId) {
            if (previous) {
                const updatedPrevious = previous.insert(value);
                if (updatedPrevious === previous) return this;
                return new List(items, updatedPrevious);
            }

            if (l === CHUNK_SIZE) {
                return new List(items, new List([value], undefined));
            } else {
                return new List([...items, value], undefined);
            }
        }

        let low = 0;
        let high = l - 1;
        while (low <= high) {
            const mid = (low + high) >>> 1;
            const midId = items[mid].id;
            if (midId === id) {
                if (items[mid] === value) return this;
                const newItems = [...items];
                newItems[mid] = value;
                return new List(newItems, previous);
            }
            if (midId < id) {
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }

        const newItems = [...items];
        newItems.splice(low, 0, value);
        if (newItems.length > CHUNK_SIZE) {
            const last = newItems.pop()!;
            const newPrevious = (
                previous ?? new List<Id, T>([], undefined)
            ).insert(last);
            return new List(newItems, newPrevious);
        }
        return new List(newItems, previous);
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
        let previous: T | undefined;
        const ids = new Set<Id>();
        for (const item of this) {
            // ids are sorted
            if (previous && previous.id <= item.id) return false;
            // no references to the future
            if (item.previous && item.id <= item.previous) return false;
            ids.add(item.id);
            previous = item;
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
            if (list.items.length > CHUNK_SIZE) return false;
        }

        return true;
    }
}
