import { describe, expect, it } from "vitest";
import { History } from "./history.ts";
import { List } from "./list.ts";

interface MyEntry extends History.Entry<number, string> {
    id: number;
    previous: number | undefined;
    operation: string;
}

function createItem(
    id: number,
    previous?: number,
    value: string = "test",
): MyEntry {
    return { id, previous, operation: value };
}

describe("History", () => {
    it("should iterate through history starting from current", () => {
        const item1 = createItem(1);
        const item2 = createItem(2, 1);
        const item3 = createItem(3, 2);

        let list = new List<MyEntry>([], undefined);
        list = list.insert(item1).insert(item2).insert(item3);

        const generateId: History.KeyGenerator<number> = (maxId) =>
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

        let list = new List<MyEntry>([], undefined);
        list = list.insert(item1).insert(item2).insert(item3);

        const generateId: History.KeyGenerator<number> = (maxId) =>
            ((maxId as number) ?? 0) + 1;

        const history = new History<number, string>(list, 3, generateId);

        const iterated = Array.from(history);
        expect(iterated).toEqual([item3, item2, item1]);
    });

    it("should return empty if current is undefined", () => {
        const item1 = createItem(1);
        let list = new List<MyEntry>([], undefined);
        list = list.insert(item1);

        const generateId: History.KeyGenerator<number> = (maxId) =>
            ((maxId as number) ?? 0) + 1;

        const history = new History<number, string>(
            list,
            undefined,
            generateId,
        );

        const iterated = Array.from(history);
        expect(iterated).toEqual([]);
    });

    const generateId: History.KeyGenerator<number> = (maxId) =>
        ((maxId as number) ?? 0) + 1;

    describe("add", () => {
        it("should add a new operation and update current", () => {
            let history = new History<number, string>(
                new List([], undefined),
                undefined,
                generateId,
            );

            history = history.add("op1");
            expect(history.current).toBe(1);
            expect(Array.from(history)).toEqual([
                { id: 1, operation: "op1", previous: undefined },
            ]);

            history = history.add("op2");
            expect(history.current).toBe(2);
            expect(Array.from(history)).toEqual([
                { id: 2, operation: "op2", previous: 1 },
                { id: 1, operation: "op1", previous: undefined },
            ]);
        });
    });

    describe("undo and redo", () => {
        it("should handle basic undo and redo", () => {
            let history = new History<number, string>(
                new List([], undefined),
                undefined,
                generateId,
            );

            history = history.add("op1").add("op2");
            expect(history.current).toBe(2);

            history = history.undo();
            expect(history.current).toBe(1);
            expect(Array.from(history)).toEqual([
                { id: 1, operation: "op1", previous: undefined },
            ]);

            history = history.undo();
            expect(history.current).toBeUndefined();
            expect(Array.from(history)).toEqual([]);

            history = history.redo();
            expect(history.current).toBe(1);
            expect(Array.from(history)).toEqual([
                { id: 1, operation: "op1", previous: undefined },
            ]);

            history = history.redo();
            expect(history.current).toBe(2);
            expect(Array.from(history)).toEqual([
                { id: 2, operation: "op2", previous: 1 },
                { id: 1, operation: "op1", previous: undefined },
            ]);
        });
    });
});
