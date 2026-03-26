import { describe, expect, it } from "vitest";
import { OperationList } from "./operation-list.ts";

describe("OperationList.setPointer", () => {
    const generateId: OperationList.IdGenerator<number> = (maxId) =>
        ((maxId as number) ?? 0) + 1;

    it("should set pointer to an existing operation", () => {
        let history = OperationList.empty<number, string>(generateId);
        history = history.add("op1").add("op2").add("op3");

        history = history.setPointer(2);
        expect(history.pointer).toBe(2);
        expect(Array.from(history).map((e) => e.operation)).toEqual(["op2", "op1"]);
    });

    it("should set pointer to an undone operation", () => {
        let history = OperationList.empty<number, string>(generateId);
        history = history.add("op1").add("op2").add("op3");

        history = history.undo().undo(); // pointer is 1. 2 and 3 are undone.
        expect(history.pointer).toBe(1);

        history = history.setPointer(3);
        expect(history.pointer).toBe(3);
        expect(Array.from(history).map((e) => e.operation)).toEqual(["op3", "op2", "op1"]);
    });

    it("should set pointer to undefined", () => {
        let history = OperationList.empty<number, string>(generateId);
        history = history.add("op1").add("op2");

        history = history.setPointer(undefined);
        expect(history.pointer).toBeUndefined();
        expect(Array.from(history)).toEqual([]);
    });

    it("should return same instance if pointer is same", () => {
        let history = OperationList.empty<number, string>(generateId);
        history = history.add("op1").add("op2");

        const updated = history.setPointer(2);
        expect(updated).toBe(history);

        const updatedUndefined = updated.undo().undo().setPointer(undefined);
        expect(updatedUndefined.pointer).toBeUndefined();
        expect(updatedUndefined.setPointer(undefined)).toBe(updatedUndefined);
    });

    it("should handle setting to non-existent ID", () => {
        let history = OperationList.empty<number, string>(generateId);
        history = history.add("op1").add("op2");

        history = history.setPointer(99);
        expect(history.pointer).toBe(99);
        expect(Array.from(history)).toEqual([]);
    });
});
