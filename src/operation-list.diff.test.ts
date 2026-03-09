import { describe, expect, it } from "vitest";
import { OperationList } from "./operation-list.ts";

describe("OperationList.diff", () => {
    const generateId: OperationList.IdGenerator<number> = (maxId) =>
        ((maxId as number) ?? 0) + 1;

    it("should diff two history lists", () => {
        let history1 = OperationList.empty<number, string>(generateId);
        history1 = history1.add("op1").add("op2");

        const history2 = history1.add("op3");

        const diff = OperationList.diff(history1, history2);
        expect(diff).toEqual([[undefined, history2.get(3)]]);
    });

    it("should detect deleted entries", () => {
        let history1 = OperationList.empty<number, string>(generateId);
        history1 = history1.add("op1").add("op2").add("op3");

        // Simulate a history where op2 is removed
        const entries = Array.from(history1.entries()).filter(
            (e) => e.id !== 2,
        );
        const history2 = OperationList.fromItems(3, entries, generateId);

        const diff = OperationList.diff(history1, history2);
        expect(diff).toEqual([[history1.entry(2), undefined]]);
    });

    it("should detect changed entries (different instances)", () => {
        const history1 = OperationList.empty<number, string>(generateId).add(
            "op1",
        );
        const entry1 = history1.entry(1);
        if (!entry1) throw new Error("Entry not found");

        // Entry with the same ID but different operation
        const entry2: OperationList.Entry<number, string> = {
            ...entry1,
            operation: "op1-modified",
        };

        const history2 = OperationList.fromItems(1, [entry2], generateId);

        const diff = OperationList.diff(history1, history2);
        expect(diff).toEqual([[entry1, entry2]]);
    });
});
