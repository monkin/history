import { describe, expect, it } from "vitest";
import { History } from "./history.ts";

describe("History.get", () => {
    const generateId: History.IdGenerator<number> = (maxId) =>
        ((maxId as number) ?? 0) + 1;

    it("should return correct entry for all items in various orders", () => {
        let history = History.empty<number, string>(generateId);
        history = history.add("op1").add("op2").add("op3");

        // op3:id 3, op2:id 2, op1:id 1
        // current is 3
        // iteration: 3, 2, 1

        expect(history.get(1)).toEqual({ id: 1, operation: "op1", previous: undefined });
        expect(history.get(3)).toEqual({ id: 3, operation: "op3", previous: 2 });
        expect(history.get(2)).toEqual({ id: 2, operation: "op2", previous: 1 });
    });

    it("should return undefined for non-existent items", () => {
        let history = History.empty<number, string>(generateId);
        history = history.add("op1");

        expect(history.get(2)).toBeUndefined();
        expect(history.get(0)).toBeUndefined();
    });

    it("should handle undo correctly for get", () => {
        let history = History.empty<number, string>(generateId);
        history = history.add("op1").add("op2").add("op3");

        history = history.undo();
        // current is 2. op3 is undone.
        // iteration: 2, 1

        expect(history.get(3)).toBeUndefined();
        expect(history.get(2)).toEqual({ id: 2, operation: "op2", previous: 1 });
        expect(history.get(1)).toEqual({ id: 1, operation: "op1", previous: undefined });

        history = history.redo();
        // current is 3 again.
        expect(history.get(3)).toEqual({ id: 3, operation: "op3", previous: 2 });
        expect(history.get(2)).toEqual({ id: 2, operation: "op2", previous: 1 });
        expect(history.get(1)).toEqual({ id: 1, operation: "op1", previous: undefined });
    });
});
