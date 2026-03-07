import { describe, expect, it } from "vitest";
import { History } from "./history.ts";
import { CompareResult, emptyList, insert } from "./sorted-list.ts";

interface MyEntry extends History.Entry<number, string> {
    id: number;
    previous: number | undefined;
    value: string;
}

function createItem(
    id: number,
    previous?: number,
    value: string = "test",
): MyEntry {
    return { id, previous, value: value };
}

describe("History", () => {
    it("should iterate through history starting from current", () => {
        const item1 = createItem(1);
        const item2 = createItem(2, 1);
        const item3 = createItem(3, 2);

        const compare = (a: MyEntry, b: MyEntry) => {
            if (a.id < b.id) return CompareResult.Greater;
            if (a.id > b.id) return CompareResult.Less;
            return CompareResult.Equal;
        };

        let list = emptyList as any;
        list = insert(list, item1, compare);
        list = insert(list, item2, compare);
        list = insert(list, item3, compare);

        const generateId: History.IdGenerator<number> = (maxId) =>
            ((maxId as number) ?? 0) + 1;

        const history = new History<number, string>(list, 2, generateId);

        // Current is 2, so it should iterate 2 -> 1
        const iterated = Array.from(history);
        expect(iterated).toEqual([item2, item1]);
    });

    it("should iterate through everything if current is maxId", () => {
        const item1 = createItem(1);
        const item2 = createItem(2, 1);
        const item3 = createItem(3, 2);

        const compare = (a: MyEntry, b: MyEntry) => {
            if (a.id < b.id) return CompareResult.Greater;
            if (a.id > b.id) return CompareResult.Less;
            return CompareResult.Equal;
        };

        let list = emptyList as any;
        list = insert(list, item1, compare);
        list = insert(list, item2, compare);
        list = insert(list, item3, compare);

        const generateId: History.IdGenerator<number> = (maxId) =>
            ((maxId as number) ?? 0) + 1;

        const history = new History<number, string>(list, 3, generateId);

        const iterated = Array.from(history);
        expect(iterated).toEqual([item3, item2, item1]);
    });

    it("should return empty if current is undefined", () => {
        const item1 = createItem(1);
        const compare = (a: MyEntry, b: MyEntry) => {
            if (a.id < b.id) return CompareResult.Greater;
            if (a.id > b.id) return CompareResult.Less;
            return CompareResult.Equal;
        };
        const list = insert(emptyList as any, item1, compare);

        const generateId: History.IdGenerator<number> = (maxId) =>
            ((maxId as number) ?? 0) + 1;

        const history = new History<number, string>(
            list,
            undefined,
            generateId,
        );

        const iterated = Array.from(history);
        expect(iterated).toEqual([]);
    });

    const generateId: History.IdGenerator<number> = (maxId) =>
        ((maxId as number) ?? 0) + 1;

    describe("add", () => {
        it("should add a new value and update current", () => {
            let history = new History<number, string>(
                emptyList as any,
                undefined,
                generateId,
            );

            history = history.add("op1");
            expect(history.current).toBe(1);
            expect(Array.from(history)).toEqual([
                { id: 1, value: "op1", previous: undefined },
            ]);

            history = history.add("op2");
            expect(history.current).toBe(2);
            expect(Array.from(history)).toEqual([
                { id: 2, value: "op2", previous: 1 },
                { id: 1, value: "op1", previous: undefined },
            ]);
        });
    });

    describe("all", () => {
        it("should return all items in the history", () => {
            let history = new History<number, string>(
                emptyList as any,
                undefined,
                generateId,
            );

            history = history.add("op1").add("op2").add("op3");
            expect(history.current).toBe(3);

            const all = Array.from(history.all());
            expect(all).toEqual([
                { id: 3, value: "op3", previous: 2 },
                { id: 2, value: "op2", previous: 1 },
                { id: 1, value: "op1", previous: undefined },
            ]);
        });

        it("should return all items even after undo", () => {
            let history = new History<number, string>(
                emptyList as any,
                undefined,
                generateId,
            );

            history = history.add("op1").add("op2").add("op3");
            history = history.undo();
            expect(history.current).toBe(2);

            const all = Array.from(history.all());
            expect(all).toEqual([
                { id: 3, value: "op3", previous: 2 },
                { id: 2, value: "op2", previous: 1 },
                { id: 1, value: "op1", previous: undefined },
            ]);
        });

        it("should return an empty array for an empty history", () => {
            const history = new History<number, string>(
                emptyList as any,
                undefined,
                generateId,
            );

            const all = Array.from(history.all());
            expect(all).toEqual([]);
        });
    });

    describe("undo and redo", () => {
        it("should handle basic undo and redo", () => {
            let history = new History<number, string>(
                emptyList as any,
                undefined,
                generateId,
            );

            history = history.add("op1").add("op2");
            expect(history.current).toBe(2);

            history = history.undo();
            expect(history.current).toBe(1);
            expect(Array.from(history)).toEqual([
                { id: 1, value: "op1", previous: undefined },
            ]);

            history = history.undo();
            expect(history.current).toBeUndefined();
            expect(Array.from(history)).toEqual([]);

            history = history.redo();
            expect(history.current).toBe(1);
            expect(Array.from(history)).toEqual([
                { id: 1, value: "op1", previous: undefined },
            ]);

            history = history.redo();
            expect(history.current).toBe(2);
            expect(Array.from(history)).toEqual([
                { id: 2, value: "op2", previous: 1 },
                { id: 1, value: "op1", previous: undefined },
            ]);
        });
    });

    describe("empty", () => {
        it("should create an empty history", () => {
            const history = History.empty<number, string>(generateId);

            expect(history.current).toBeUndefined();
            expect(history.canUndo).toBe(false);
            expect(history.canRedo).toBe(false);
            expect(Array.from(history)).toEqual([]);
            expect(Array.from(history.all())).toEqual([]);
        });
    });

    describe("upload", () => {
        it("should upload missing older items", () => {
            let history = History.empty<number, string>(generateId);
            const item1 = { id: 1, value: "op1", previous: undefined };
            const item2 = { id: 2, value: "op2", previous: 1 };
            const item3 = { id: 3, value: "op3", previous: 2 };

            history = history.upload([item3]);
            expect(history.current).toBeUndefined();

            history = history.upload([item1, item2]);
            expect(Array.from(history.all())).toEqual([item3, item2, item1]);
        });

        it("should allow replacing existing items including current", () => {
            let history = History.empty<number, string>(generateId);
            history = history.add("op1"); // ID 1, current 1

            const updatedItem = {
                id: 1,
                value: "updated op1",
                previous: undefined,
            };
            history = history.upload([updatedItem]);

            expect(history.current).toBe(1);
            expect(Array.from(history)).toEqual([updatedItem]);
        });
    });

    describe("fromItems", () => {
        it("should create history from items and current pointer", () => {
            const item1 = { id: 1, value: "op1", previous: undefined };
            const item2 = { id: 2, value: "op2", previous: 1 };
            const item3 = { id: 3, value: "op3", previous: 2 };
            const items = [item1, item2, item3];

            const history = History.fromItems<number, string>(
                2,
                items,
                generateId,
            );

            expect(history.current).toBe(2);
            expect(Array.from(history)).toEqual([item2, item1]);
            expect(Array.from(history.all())).toEqual([item3, item2, item1]);
        });

        it("should handle empty items", () => {
            const history = History.fromItems<number, string>(
                undefined,
                [],
                generateId,
            );

            expect(history.current).toBeUndefined();
            expect(Array.from(history)).toEqual([]);
            expect(Array.from(history.all())).toEqual([]);
        });

        it("should handle out-of-order items", () => {
            const item1 = { id: 1, value: "op1", previous: undefined };
            const item2 = { id: 2, value: "op2", previous: 1 };
            const item3 = { id: 3, value: "op3", previous: 2 };
            const items = [item3, item1, item2]; // out of order

            const history = History.fromItems<number, string>(
                3,
                items,
                generateId,
            );

            expect(history.current).toBe(3);
            expect(Array.from(history.all())).toEqual([item3, item2, item1]);
        });
    });
});
