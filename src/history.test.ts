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

        const history = new History<number, string>(
            list,
            2,
            undefined,
            generateId,
        );

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

        const history = new History<number, string>(
            list,
            3,
            undefined,
            generateId,
        );

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

        it("should rollback active operation before adding new one", () => {
            let history = new History<number, string>(
                new List([], undefined),
                undefined,
                undefined,
                generateId,
            );

            history = history.add("op1");
            history = history.begin("active op");
            history = history.update("updated active op");

            // add() should rollback the active operation and then add the new one
            history = history.add("op2");

            expect(history.active).toBeUndefined();
            expect(history.current).toBe(3); // 1 (op1), 2 (active), 3 (op2)
            const items = Array.from(history);
            expect(items).toHaveLength(2);
            expect(items[0]).toEqual({
                id: 3,
                operation: "op2",
                previous: 1,
            });
            expect(items[1]).toEqual({
                id: 1,
                operation: "op1",
                previous: undefined,
            });
        });
    });

    describe("multi-step operations (begin, update, commit)", () => {
        it("should handle a full multi-step operation flow", () => {
            let history = new History<number, string>(
                new List([], undefined),
                undefined,
                undefined,
                generateId,
            );

            history = history.add("op1");
            history = history.begin("step1");

            expect(history.active).toBe(2);
            expect(history.current).toBe(2);
            expect(Array.from(history)[0].operation).toBe("step1");

            history = history.update("step1 updated");
            expect(history.active).toBe(2);
            expect(history.current).toBe(2);
            expect(Array.from(history)[0].operation).toBe("step1 updated");

            history = history.commit();
            expect(history.active).toBeUndefined();
            expect(history.current).toBe(2);
            expect(Array.from(history)[0].operation).toBe("step1 updated");

            // Verify we can still undo to op1
            history = history.undo();
            expect(history.current).toBe(1);
            expect(Array.from(history)).toHaveLength(1);
            expect(Array.from(history)[0].operation).toBe("op1");
        });

        it("should do nothing on update if no active operation", () => {
            let history = new History<number, string>(
                new List([], undefined),
                undefined,
                undefined,
                generateId,
            );
            const initialHistory = history;
            history = history.update("something");
            expect(history).toBe(initialHistory);
        });

        it("should do nothing on commit if no active operation", () => {
            let history = new History<number, string>(
                new List([], undefined),
                undefined,
                undefined,
                generateId,
            );
            const initialHistory = history;
            history = history.commit();
            expect(history).toBe(initialHistory);
        });
    });

    describe("rollback", () => {
        it("should remove the active operation and restore current to previous", () => {
            let history = new History<number, string>(
                new List([], undefined),
                undefined,
                undefined,
                generateId,
            );

            history = history.add("op1");
            history = history.begin("active op");
            history = history.update("updated active op");

            expect(history.active).toBe(2);
            expect(history.current).toBe(2);

            history = history.rollback();

            expect(history.active).toBeUndefined();
            expect(history.current).toBe(1);
            expect(Array.from(history)).toEqual([
                { id: 1, operation: "op1", previous: undefined },
            ]);
        });

        it("should do nothing if no active operation", () => {
            let history = new History<number, string>(
                new List([], undefined),
                undefined,
                undefined,
                generateId,
            );
            const initialHistory = history;
            history = history.rollback();
            expect(history).toBe(initialHistory);
        });
    });
});
