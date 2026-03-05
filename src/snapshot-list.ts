/** @internal */
interface Node<Key extends string | number, Snapshot> {
    readonly key: Key;
    readonly snapshot: Snapshot;
    readonly next: SnapshotList<Key, Snapshot>;
}

export class SnapshotList<Key extends string | number, Snapshot> {
    private constructor(
        private readonly node: Node<Key, Snapshot> | undefined,
    ) {}

    add(key: Key, snapshot: Snapshot): SnapshotList<Key, Snapshot> {
        return new SnapshotList({ key, snapshot, next: this });
    }

    get(key: Key): Snapshot | undefined {
        const node = this.node;
        if (node === undefined) return undefined;
        if (node.key === key) return node.snapshot;
        return node.next.get(key);
    }

    remove(key: Key): SnapshotList<Key, Snapshot> {
        const node = this.node;
        if (node === undefined) return this;
        if (node.key === key) return node.next;

        const next = node.next.remove(key);
        if (next === node.next) return this;
        return new SnapshotList({
            key: node.key,
            snapshot: node.snapshot,
            next,
        });
    }

    filter(
        predicate: (key: Key, snapshot: Snapshot) => boolean,
    ): SnapshotList<Key, Snapshot> {
        const node = this.node;
        if (node === undefined) return this;

        const next = node.next.filter(predicate);
        if (predicate(node.key, node.snapshot)) {
            if (next === node.next) return this;
            return new SnapshotList({
                key: node.key,
                snapshot: node.snapshot,
                next,
            });
        }
        return next;
    }

    private static emptyInstance = new SnapshotList<string | number, any>(
        undefined,
    );

    static empty<Key extends string | number, Snapshot>(): SnapshotList<
        Key,
        Snapshot
    > {
        return SnapshotList.emptyInstance as SnapshotList<Key, Snapshot>;
    }
}
