import { describe, expect, it } from "vitest";
import { OperationList } from "./operation-list.ts";

describe("OperationList generation", () => {
    const generateId: OperationList.IdGenerator<number> = (maxId) =>
        ((maxId as number) ?? 0) + 1;

    it("should set generation to 0 for the first entry", () => {
        let history = OperationList.empty<number, string>(generateId);
        history = history.add("op1");

        const entry = history.get(1);
        expect(entry?.generation).toBe(0);
    });

    it("should increment generation for subsequent entries", () => {
        let history = OperationList.empty<number, string>(generateId);
        history = history.add("op1").add("op2").add("op3");

        expect(history.get(1)?.generation).toBe(0);
        expect(history.get(2)?.generation).toBe(1);
        expect(history.get(3)?.generation).toBe(2);
    });

    it("should correctly calculate generation after undo and branch", () => {
        let history = OperationList.empty<number, string>(generateId);
        history = history.add("op1").add("op2"); // 1(gen 0), 2(gen 1)

        history = history.undo(); // current is 1
        history = history.add("op3"); // 1(gen 0), 3(gen 1)

        const all = Array.from(history.entries());
        const getFromAll = (id: number) => all.find((e) => e.id === id);

        expect(getFromAll(1)?.generation).toBe(0);
        expect(getFromAll(2)?.generation).toBe(1);
        expect(getFromAll(3)?.generation).toBe(1);

        history = history.add("op4"); // 4(gen 2)
        expect(history.get(4)?.generation).toBe(2);
    });
});
