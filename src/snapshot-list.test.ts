import { describe, it, expect } from "vitest";
import { SnapshotList } from "./snapshot-list.ts";

describe("SnapshotList", () => {
    it("should be empty initially", () => {
        const list = SnapshotList.empty<number, string>();
        expect([...list]).toEqual([]);
    });

    it("should add a snapshot", () => {
        const list = SnapshotList.empty<number, string>().add(1, "one");
        expect([...list]).toEqual([{ id: 1, snapshot: "one" }]);
    });

    it("should add multiple snapshots", () => {
        const list = SnapshotList.empty<number, string>()
            .add(1, "one")
            .add(2, "two");
        // Sorted by ID descending
        expect([...list]).toEqual([
            { id: 2, snapshot: "two" },
            { id: 1, snapshot: "one" },
        ]);
    });

    it("should add all snapshots", () => {
        const list = SnapshotList.empty<number, string>().addAll([
            { id: 1, snapshot: "one" },
            { id: 2, snapshot: "two" },
        ]);
        expect([...list]).toEqual([
            { id: 2, snapshot: "two" },
            { id: 1, snapshot: "one" },
        ]);
    });

    it("should remove a snapshot by id", () => {
        const list = SnapshotList.empty<number, string>()
            .addAll([
                { id: 1, snapshot: "one" },
                { id: 2, snapshot: "two" },
                { id: 3, snapshot: "three" },
            ])
            .removeById(2);
        expect([...list]).toEqual([
            { id: 3, snapshot: "three" },
            { id: 1, snapshot: "one" },
        ]);
    });

    it("should filter snapshots", () => {
        const list = SnapshotList.empty<number, string>()
            .addAll([
                { id: 1, snapshot: "one" },
                { id: 2, snapshot: "two" },
                { id: 3, snapshot: "three" },
            ])
            .filter((item) => item.id !== 2);
        expect([...list]).toEqual([
            { id: 3, snapshot: "three" },
            { id: 1, snapshot: "one" },
        ]);
    });

    it("should replace a snapshot with the same id", () => {
        const list = SnapshotList.empty<number, string>()
            .add(1, "one")
            .add(1, "updated one");
        expect([...list]).toEqual([{ id: 1, snapshot: "updated one" }]);
    });

    it("should handle removing non-existing id", () => {
        const list = SnapshotList.empty<number, string>()
            .add(1, "one")
            .removeById(2);
        expect([...list]).toEqual([{ id: 1, snapshot: "one" }]);
    });

    it("should handle filter removing everything", () => {
        const list = SnapshotList.empty<number, string>()
            .add(1, "one")
            .filter(() => false);
        expect([...list]).toEqual([]);
    });

    it("should work with string ids", () => {
        const list = SnapshotList.empty<string, string>()
            .add("b", "banana")
            .add("a", "apple")
            .add("c", "cherry");
        expect([...list]).toEqual([
            { id: "c", snapshot: "cherry" },
            { id: "b", snapshot: "banana" },
            { id: "a", snapshot: "apple" },
        ]);
    });
});
