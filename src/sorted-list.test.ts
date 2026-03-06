import { describe, expect, it } from "vitest";
import {
    CompareResult,
    emptyList,
    insert,
    type SortedList,
} from "./sorted-list";

describe("SortedList", () => {
    const compare = (a: number, b: number) => {
        if (a < b) return CompareResult.Less;
        if (a > b) return CompareResult.Greater;
        return CompareResult.Equal;
    };

    it("should insert between first and last", () => {
        let list: SortedList<number> = insert(emptyList, 10, compare);
        list = insert(list, 20, compare);
        list = insert(list, 15, compare);
        expect(list.items).toEqual([10, 15, 20]);
    });

    it("should replace an item in the middle if equal", () => {
        const obj15 = { val: 15, tag: "old" };
        const obj10 = { val: 10 };
        const obj20 = { val: 20 };

        const compareObj = (a: { val: number }, b: { val: number }) => {
            if (a.val < b.val) return CompareResult.Less;
            if (a.val > b.val) return CompareResult.Greater;
            return CompareResult.Equal;
        };

        let listObj = insert(emptyList as any, obj10, compareObj);
        listObj = insert(listObj, obj20, compareObj);
        listObj = insert(listObj, obj15, compareObj);

        const obj15new = { val: 15, tag: "new" };
        const updatedList = insert(listObj, obj15new, compareObj);

        expect(updatedList.items[1]).toBe(obj15new);
        expect(updatedList.items[1]).not.toBe(obj15);
    });

    it("should not change list if item is exactly equal (===) to existing item", () => {
        let list: SortedList<number> = insert(emptyList as any, 10, compare);
        list = insert(list, 20, compare);
        list = insert(list, 15, compare);

        const updatedList = insert(list, 15, compare);
        expect(updatedList).toBe(list);
    });

    it("should split chunks when they grow too large", () => {
        let list = emptyList as any;
        for (let i = 0; i < 100; i++) {
            list = insert(list, i * 2, compare);
        }
        // Insert in the middle
        list = insert(list, 55, compare);

        // Verify structure
        let current = list;
        while (current) {
            expect(current.items.length).toBeLessThanOrEqual(32);
            current = current.next;
        }

        // Verify items are all there and sorted
        const allItems = [];
        current = list;
        while (current) {
            allItems.push(...current.items);
            current = current.next;
        }
        expect(allItems).toContain(55);
        for (let i = 0; i < allItems.length - 1; i++) {
            expect(allItems[i]).toBeLessThan(allItems[i + 1]);
        }
    });
});
