import { emptyList, type SortedList } from "./sorted-list.ts";

/**
 * Immutable list of snapshots
 */
export class SnapshotList<Id extends string | number, Snapshot> {
    /** @internal */
    constructor(
        private readonly items: SortedList<SnapshotList.Item<Id, Snapshot>>,
    ) {}

    static empty<Id extends string | number, Snapshot>(): SnapshotList<
        Id,
        Snapshot
    > {
        return new SnapshotList(emptyList);
    }
}

export namespace SnapshotList {
    export type Item<Id extends string | number, Snapshot> = {
        id: Id;
        snapshot: Snapshot;
    };
}
