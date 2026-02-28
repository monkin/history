import type { History } from "./history";

/** @internal */
export const CHUNK_SIZE = 32;

export class List<T extends History.Entry<string | number, unknown>> {
    /**
     * Items sorted by id. Items should not contain more than CHUNK_SIZE elements.
     * @internal
     */
    readonly items: T[];
    /**
     * @internal
     */
    readonly previous: List<T> | undefined;

    constructor(items: T[], previous: List<T> | undefined) {
        this.items = items;
        this.previous = previous;
    }

    /**
     * The latest id in the list.
     */
    get maxId(): History.Key<T> | undefined {
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

    has(id: History.Key<T>): boolean {
        const { maxId, items, previous } = this;
        const l = items.length;
        if (maxId && id > maxId) return false;
        if (!l || id < items[l - 1].id) return previous?.has(id) ?? false;
        return items.some((i) => i.id === id);
    }

    get(id: History.Key<T>): T | undefined {
        const { maxId, items, previous } = this;
        const l = items.length;

        // this id probably was added later
        if (maxId && id > maxId) return undefined;

        // id is smaller than the smallest in the current chunk
        if (!l || id < items[l - 1].id) return previous?.get(id);

        // it should be present in the current chunk
        return items.find((i) => i.id === id);
    }

    remove(id: History.Key<T>): List<T> {
        const { items, previous, maxId } = this;
        const l = items.length;

        if (maxId === undefined || id > maxId) return this;

        if (l === 0 || id < items[l - 1].id) {
            if (!previous) return this;
            const updated = previous.remove(id);
            if (updated === previous) return this;
            return l === 0 ? updated : new List(items, updated);
        }

        const index = items.findIndex((i) => i.id === id);
        if (index === -1) return this;

        const newItems = [...items.slice(0, index), ...items.slice(index + 1)];
        if (newItems.length === 0) return previous ?? new List([], undefined);

        return new List(newItems, previous);
    }

    insert(value: T): List<T> {
        const { items, previous } = this;
        const { id } = value;
        const l = items.length;

        if (l === 0) {
            return previous?.insert(value) ?? new List([value], undefined);
        }

        if (id > items[0].id) {
            return l === CHUNK_SIZE
                ? new List([value], this)
                : new List([value, ...items], previous);
        }

        if (id < items[l - 1].id) {
            if (previous) {
                const updated = previous.insert(value);
                return updated === previous ? this : new List(items, updated);
            }
            return l === CHUNK_SIZE
                ? new List(items, new List([value], undefined))
                : new List([...items, value], undefined);
        }

        const index = items.findIndex((i) => i.id <= id);
        if (items[index].id === id) {
            if (items[index] === value) return this;
            const newItems = [...items];
            newItems[index] = value;
            return new List(newItems, previous);
        }

        return new List(
            [...items.slice(0, index), value, ...items.slice(index)],
            previous,
        ).split();
    }

    /**
     * Split the current chunk if it has more than CHUNK_SIZE elements.
     */
    private split(): List<T> {
        const { items, previous } = this;
        const l = items.length;
        if (l > CHUNK_SIZE) {
            const chunks: T[][] = [];
            const count = Math.ceil(l / CHUNK_SIZE);

            for (let i = 0; i < count; i++) {
                const offset = l - CHUNK_SIZE * i;
                chunks.push(
                    items.slice(Math.max(0, offset - CHUNK_SIZE), offset),
                );
            }

            chunks.reverse();

            return chunks.reverse().reduce((list, chunk) => {
                return new List(chunk, list);
            }, previous) as List<T>;
        } else {
            return this;
        }
    }

    private insertAllSorted(values: T[]): List<T> {
        if (values.length === 0) return this;
        if (values.length === 1) return this.insert(values[0]);

        const { maxId, items, previous } = this;

        if (this.isEmpty() || !maxId) {
            return new List<T>(values, undefined).split();
        }
        const l = items.length;
        const minId = items[l - 1].id; // minimal id in the current chunk

        if (maxId && values[values.length - 1].id > maxId) {
            return new List<T>(values, this).split();
        }

        if (values[0].id < minId) {
            if (previous) {
                const updated = previous.insertAllSorted(values);
                return updated === previous ? this : new List(items, updated);
            } else {
                return new List<T>([...items, ...values], undefined).split();
            }
        }

        const smaller: T[] = [];
        const inside: T[] = [];
        const larger: T[] = [];

        const insideIds = new Set<History.Key<T>>();

        values.forEach((value) => {
            if (value.id < minId) {
                smaller.push(value);
            } else if (value.id <= maxId) {
                insideIds.add(value.id);
                inside.push(value);
            } else {
                larger.push(value);
            }
        });

        if (inside.length === 0) {
            return this.insertAllSorted(smaller).insertAllSorted(larger);
        } else {
            const updated = [
                ...items.filter((i) => !insideIds.has(i.id)),
                ...inside,
            ].sort((a, b) => (a.id > b.id ? -1 : 1));

            if (
                updated.length === items.length &&
                updated.every((v, i) => items[i] === v)
            ) {
                return this.insertAllSorted(smaller).insertAllSorted(larger);
            }

            return new List<T>(updated, previous)
                .split()
                .insertAllSorted(smaller)
                .insertAllSorted(larger);
        }
    }

    /**
     * Insert a list of items in the correct order.
     * If an inserted item has the same id as an existing one, it will replace the existing one.
     */
    insertAll(values: T[]): List<T> {
        if (values.length === 0) return this;

        return this.insertAllSorted(
            values.slice().sort((a, b) => (a.id > b.id ? -1 : 1)),
        );
    }

    /**
     * Iterate over items starting from the given id.
     * This iteration method skips unreferenced items, it follows the chain of `previous` field references.
     */
    *iterate(startFrom: History.Key<T> | undefined): Generator<T> {
        // looks like the history is empty, or we made as many undo steps as possible
        if (startFrom === undefined) return;

        let lookingFor = startFrom;
        for (const item of this) {
            const { id, previous } = item;
            if (id === lookingFor) {
                yield item;
                if (previous !== undefined) {
                    lookingFor = previous;
                } else {
                    break;
                }
            } else if (id < lookingFor) {
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

    /**
     * Check if the list is valid. It will return false if the list is not completely loaded.
     *
     * A list is valid if:
     * - ids are sorted in descending order
     * - no references to the future (previous id is less than current id)
     * - all ids are present in the list
     * - all chunks are not too big (max size is CHUNK_SIZE items)
     */
    isValid(): boolean {
        let previous: T | undefined;
        const ids = new Set<History.Key<T>>();
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
        for (let list: List<T> | undefined = this; list; list = list.previous) {
            if (list.items.length > CHUNK_SIZE) return false;
        }

        return true;
    }
}
