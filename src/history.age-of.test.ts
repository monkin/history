import { describe, expect, it } from "vitest";
import { History } from "./history.ts";

describe("History.ageOf reproduction", () => {
    const generateId: History.IdGenerator<number> = (maxId) =>
        ((maxId as number) ?? 0) + 1;

    it("should return correct age for entries items in various orders", () => {
        let history = History.empty<number, string>(generateId);
        history = history.add("op1").add("op2").add("op3");

        // op3 is id 3, op2 is id 2, op1 is id 1
        // current is 3
        // iteration: 3, 2, 1
        // ages: 3:0, 2:1, 1:2

        // If I call ageOf(1) first, it iterates through 3, 2, then 1.
        expect(history.ageOf(1)).toBe(2);

        // Subsequent calls for already iterated items (3, 2) should also be correct.
        // If it's buggy, it will fail here.
        expect(history.ageOf(3)).toBe(0);
        expect(history.ageOf(2)).toBe(1);
    });

    it("should handle undo and redo correctly for ageOf", () => {
        let history = History.empty<number, string>(generateId);
        history = history.add("op1").add("op2").add("op3");

        history = history.undo();
        // current is 2. op3 is undone.
        // iteration: 2, 1
        // ages: 2:0, 1:1

        expect(history.ageOf(3)).toBeUndefined();
        expect(history.ageOf(2)).toBe(0);
        expect(history.ageOf(1)).toBe(1);

        history = history.redo();
        // current is 3 again.
        expect(history.ageOf(3)).toBe(0);
        expect(history.ageOf(2)).toBe(1);
        expect(history.ageOf(1)).toBe(2);
    });

    it("should handle larger history (multi-chunk)", () => {
        let history = History.empty<number, string>(generateId);
        for (let i = 1; i <= 100; i++) {
            history = history.add(`op${i}`);
        }

        expect(history.ageOf(100)).toBe(0);
        expect(history.ageOf(1)).toBe(99);
        expect(history.ageOf(50)).toBe(50);
        expect(history.ageOf(101)).toBeUndefined();
    });

    it("should handle history with branches (after undo and add)", () => {
        let history = History.empty<number, string>(generateId);
        history = history.add("op1").add("op2").add("op3");

        history = history.undo().undo(); // current is 1
        expect(history.ageOf(1)).toBe(0);
        expect(history.ageOf(2)).toBeUndefined();
        expect(history.ageOf(3)).toBeUndefined();

        history = history.add("op4"); // current is 4, previous is 1
        // Path: 4 -> 1. op2 and op3 are in history.entries() but not in current history branch.
        expect(history.ageOf(4)).toBe(0);
        expect(history.ageOf(1)).toBe(1);
        expect(history.ageOf(2)).toBeUndefined();
        expect(history.ageOf(3)).toBeUndefined();

        history = history.undo(); // current is 1 again
        expect(history.ageOf(1)).toBe(0);
        expect(history.ageOf(4)).toBeUndefined();

        history = history.redo(); // current is 4 again (since it's on the path from maxId)
        expect(history.ageOf(4)).toBe(0);
        expect(history.ageOf(1)).toBe(1);
    });

    it("should return correct age after multiple undo/redo combinations", () => {
        let history = History.empty<number, string>(generateId);
        history = history.add("1").add("2").add("3").add("4").add("5");

        history = history.undo().undo(); // current is 3
        expect(history.ageOf(3)).toBe(0);
        expect(history.ageOf(4)).toBeUndefined();
        expect(history.ageOf(5)).toBeUndefined();

        history = history.redo(); // current is 4
        expect(history.ageOf(4)).toBe(0);
        expect(history.ageOf(3)).toBe(1);
        expect(history.ageOf(5)).toBeUndefined();

        history = history.undo().undo().undo(); // current is 1
        expect(history.ageOf(1)).toBe(0);
        expect(history.ageOf(2)).toBeUndefined();

        history = history.redo().redo(); // current is 3
        expect(history.ageOf(3)).toBe(0);
        expect(history.ageOf(2)).toBe(1);
        expect(history.ageOf(1)).toBe(2);
    });
});
