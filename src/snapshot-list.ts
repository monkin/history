export class SnapshotList<Id extends string | number, Snapshot> {}

export namespace SnapshotList {
    export type Item<Id extends string | number, Snapshot> = {
        id: Id;
        snapshot: Snapshot;
    };
}
