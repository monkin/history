import { describe, expect, it } from "vitest";
import {
    each,
    insertAfter,
    insertBefore,
    LoopControl,
    prepend,
    slist,
} from "./slist";

describe("slist", () => {
    it("should create a single node list", () => {
        const list = slist(1);
        expect(list).toEqual({ value: 1, next: undefined });
    });

    it("should create a list with two nodes", () => {
        const list2 = slist(2);
        const list1 = slist(1, list2);
        expect(list1).toEqual({
            value: 1,
            next: { value: 2, next: undefined },
        });
    });

    describe("prepend", () => {
        it("should prepend to undefined", () => {
            const list = prepend(1, undefined);
            expect(list).toEqual({ value: 1, next: undefined });
        });

        it("should prepend to an existing list", () => {
            const list1 = slist(2);
            const list = prepend(1, list1);
            expect(list).toEqual({
                value: 1,
                next: { value: 2, next: undefined },
            });
            expect(list.next).toBe(list1); // check structural sharing
        });
    });

    describe("each", () => {
        it("should not call callback for empty list", () => {
            let count = 0;
            each(undefined, () => {
                count++;
                return LoopControl.Continue;
            });
            expect(count).toBe(0);
        });

        it("should iterate over all elements", () => {
            const list = slist(1, slist(2, slist(3)));
            const values: number[] = [];
            each(list, (v) => {
                values.push(v);
                return LoopControl.Continue;
            });
            expect(values).toEqual([1, 2, 3]);
        });

        it("should break when callback returns 1", () => {
            const list = slist(1, slist(2, slist(3)));
            const values: number[] = [];
            each(list, (v) => {
                values.push(v);
                if (v === 2) return LoopControl.Break;
                return LoopControl.Continue;
            });
            expect(values).toEqual([1, 2]);
        });

        it("should continue when callback returns undefined", () => {
            const list = slist(1, slist(2));
            const values: number[] = [];
            each(list, (v) => {
                values.push(v);
                return; // returns undefined
            });
            expect(values).toEqual([1, 2]);
        });
    });

    describe("insertBefore", () => {
        it("should insert into empty list", () => {
            const list = insertBefore(undefined, 1, () => true);
            expect(list).toEqual({ value: 1, next: undefined });
        });

        it("should insert at the beginning", () => {
            const list = slist(2, slist(3));
            const newList = insertBefore(list, 1, (v) => v === 2);
            expect(newList).toEqual({
                value: 1,
                next: { value: 2, next: { value: 3, next: undefined } },
            });
        });

        it("should insert in the middle", () => {
            const list = slist(1, slist(3));
            const newList = insertBefore(list, 2, (v) => v === 3);
            expect(newList).toEqual({
                value: 1,
                next: { value: 2, next: { value: 3, next: undefined } },
            });
        });

        it("should append at the end if predicate never matches", () => {
            const list = slist(1, slist(2));
            const newList = insertBefore(list, 3, (v) => v === 4);
            expect(newList).toEqual({
                value: 1,
                next: { value: 2, next: { value: 3, next: undefined } },
            });
        });

        it("should preserve structural sharing for tail", () => {
            const list3 = slist(3);
            const list2 = slist(2, list3);
            const list1 = slist(1, list2);

            const newList = insertBefore(list1, 1.5, (v) => v === 2);
            // 1 -> 1.5 -> 2 -> 3
            expect(newList?.next?.next).toBe(list2);
        });
    });

    describe("insertAfter", () => {
        it("should insert into empty list", () => {
            const list = insertAfter(undefined, 1, () => true);
            expect(list).toEqual({ value: 1, next: undefined });
        });

        it("should insert after the first node", () => {
            const list = slist(1, slist(3));
            const newList = insertAfter(list, 2, (v) => v === 1);
            expect(newList).toEqual({
                value: 1,
                next: { value: 2, next: { value: 3, next: undefined } },
            });
        });

        it("should insert after the last node", () => {
            const list = slist(1, slist(2));
            const newList = insertAfter(list, 3, (v) => v === 2);
            expect(newList).toEqual({
                value: 1,
                next: { value: 2, next: { value: 3, next: undefined } },
            });
        });

        it("should append at the end if predicate never matches", () => {
            const list = slist(1, slist(2));
            const newList = insertAfter(list, 3, (v) => v === 4);
            expect(newList).toEqual({
                value: 1,
                next: { value: 2, next: { value: 3, next: undefined } },
            });
        });

        it("should preserve structural sharing for tail", () => {
            const list3 = slist(3);
            const list2 = slist(2, list3);
            const list1 = slist(1, list2);

            const newList = insertAfter(list1, 1.5, (v) => v === 1);
            // 1 -> 1.5 -> 2 -> 3
            expect(newList?.next?.next).toBe(list2);
        });
    });
});
