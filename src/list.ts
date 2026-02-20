import type { Item } from "./item.ts";

const CHUNK_SIZE = 32;

/**
 * Immutable list of items ordered by id.
 * Elements with higher id are placed first.
 */
export class List<Id extends string | number, T extends Item<Id>> {
    constructor(
        private readonly items: T[],
        private readonly previous: List<Id, T> | undefined,
    ) {}

    get maxId(): Id | undefined {
        return this.items[0]?.id ?? this.previous?.maxId;
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

    *[Symbol.iterator](): Generator<T> {
        yield* this.items;
        if (this.previous) yield* this.previous;
    }

    isValid(): boolean {
        return this.items.every((i, idx) => i.id === idx.toString());
    }
}
