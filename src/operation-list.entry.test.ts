import { describe, expect, it } from "vitest";
import { OperationList } from "./operation-list.ts";

describe("OperationList.entry", () => {
    const generateId: OperationList.IdGenerator<number> = (maxId) =>
        ((maxId as number) ?? 0) + 1;

    it("should return any entry by id even if undone", () => {
        let history = OperationList.empty<number, string>(generateId);
        history = history.add("op1").add("op2").add("op3");

        history = history.undo();
        // current is 2. op3 is undone.

        expect(history.get(3)).toBeUndefined();
        expect(history.entry(3)).toEqual({
            id: 3,
            operation: "op3",
            previous: 2,
            generation: 2,
        });

        expect(history.get(2)).toEqual({
            id: 2,
            operation: "op2",
            previous: 1,
            generation: 1,
        });
        expect(history.entry(2)).toEqual({
            id: 2,
            operation: "op2",
            previous: 1,
            generation: 1,
        });
    });

    it("should return undefined for non-existent entries", () => {
        let history = OperationList.empty<number, string>(generateId);
        history = history.add("op1");

        expect(history.entry(2)).toBeUndefined();
        expect(history.entry(0)).toBeUndefined();
    });
});

describe("OperationList.entries", () => {
    const generateId: OperationList.IdGenerator<number> = (maxId) =>
        ((maxId as number) ?? 0) + 1;

    it("should yield all entries in history", () => {
        let history = OperationList.empty<number, string>(generateId);
        history = history.add("op1").add("op2").add("op3");

        history = history.undo();

        const entries = Array.from(history.entries());
        expect(entries).toHaveLength(3);
        expect(entries.map((e) => e.operation)).toEqual(["op3", "op2", "op1"]);
    });
});
