import { describe, expect, it } from "vitest";
import { SnapshotList } from "./snapshot-list.ts";

describe("SnapshotList.diff", () => {
    it("should diff two snapshot lists", () => {
        let snapshots1 = SnapshotList.empty<number, string>();
        snapshots1 = snapshots1.add(1, "s1").add(2, "s2");

        const snapshots2 = snapshots1.add(3, "s3");

        const diff = SnapshotList.diff(snapshots1, snapshots2);
        expect(diff).toEqual([[undefined, snapshots2.get(3)]]);
    });

    it("should detect deleted entries", () => {
        let snapshots1 = SnapshotList.empty<number, string>();
        snapshots1 = snapshots1.add(1, "s1").add(2, "s2").add(3, "s3");

        const snapshots2 = snapshots1.remove(2);

        const diff = SnapshotList.diff(snapshots1, snapshots2);
        expect(diff).toEqual([[snapshots1.get(2), undefined]]);
    });

    it("should detect changed entries (different instances)", () => {
        const snapshots1 = SnapshotList.empty<number, string>().add(1, "s1");
        const item1 = snapshots1.get(1);
        if (!item1) throw new Error("Item not found");

        // Item with the same ID but different snapshot
        const item2: SnapshotList.Item<number, string> = {
            ...item1,
            snapshot: "s1-modified",
        };

        const snapshots2 = SnapshotList.fromItems([item2]);

        const diff = SnapshotList.diff(snapshots1, snapshots2);
        expect(diff).toEqual([[item1, item2]]);
    });
});
