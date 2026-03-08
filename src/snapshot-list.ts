import { lookup } from "./lookup.ts";
import {
    Comparison,
    emptyList,
    filter,
    insert,
    insertAll,
    iterate,
    remove,
    type SortedList,
} from "./sorted-list.ts";

/**
 * Immutable list of snapshots
 */
export class SnapshotList<Id extends string | number, Snapshot> {
    /** @internal */
    constructor(
        /** @internal */
        private readonly items: SortedList<SnapshotList.Item<Id, Snapshot>>,
    ) {}

    static empty<Id extends string | number, Snapshot>(): SnapshotList<
        Id,
        Snapshot
    > {
        return new SnapshotList(emptyList);
    }

    [Symbol.iterator](): IterableIterator<SnapshotList.Item<Id, Snapshot>> {
        return iterate(this.items);
    }

    add(id: Id, snapshot: Snapshot): SnapshotList<Id, Snapshot> {
        return new SnapshotList(
            insert(this.items, { id, snapshot }, compareItems),
        );
    }

    addAll(
        items: Iterable<SnapshotList.Item<Id, Snapshot>>,
    ): SnapshotList<Id, Snapshot> {
        return new SnapshotList(
            insertAll(this.items, Array.from(items), compareItems),
        );
    }

    get(id: Id): SnapshotList.Item<Id, Snapshot> | undefined {
        return lookup(this, id);
    }

    remove(id: Id): SnapshotList<Id, Snapshot> {
        return new SnapshotList(remove(this.items, lookupById(id)));
    }

    filter(
        predicate: (item: SnapshotList.Item<Id, Snapshot>) => boolean,
    ): SnapshotList<Id, Snapshot> {
        return new SnapshotList(filter(this.items, predicate));
    }
}

const compareItems = (
    a: SnapshotList.Item<any, any>,
    b: SnapshotList.Item<any, any>,
): Comparison => {
    if (a.id < b.id) return Comparison.Greater;
    if (a.id > b.id) return Comparison.Less;
    return Comparison.Equal;
};

const lookupById =
    <Id extends string | number>(id: Id) =>
    (item: SnapshotList.Item<Id, any>): Comparison => {
        if (id < item.id) return Comparison.Greater;
        if (id > item.id) return Comparison.Less;
        return Comparison.Equal;
    };

export namespace SnapshotList {
    export type Item<Id extends string | number, Snapshot> = {
        id: Id;
        snapshot: Snapshot;
    };
}
