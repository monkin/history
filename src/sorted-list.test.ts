import { describe, expect, it } from "vitest";
import {
    CompareResult,
    each,
    emptyList,
    insert,
    insertAll,
    type SortedList,
    toArray,
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
        expect(toArray(list)).toEqual([10, 15, 20]);
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

        let listObj = insert(emptyList, obj10, compareObj);
        listObj = insert(listObj, obj20, compareObj);
        listObj = insert(listObj, obj15, compareObj);

        const obj15new = { val: 15, tag: "new" };
        const updatedList = insert(listObj, obj15new, compareObj);

        const items = toArray(updatedList);
        expect(items[1]).toBe(obj15new);
        expect(items[1]).not.toBe(obj15);
    });

    it("should not change list if item is exactly equal (===) to existing item", () => {
        let list: SortedList<number> = insert(emptyList, 10, compare);
        list = insert(list, 20, compare);
        list = insert(list, 15, compare);

        const updatedList = insert(list, 15, compare);
        expect(updatedList).toBe(list);
    });

    it("should split chunks when they grow too large", () => {
        let list: SortedList<number> = emptyList;
        for (let i = 0; i < 100; i++) {
            list = insert(list, i * 2, compare);
        }
        // Insert in the middle
        list = insert(list, 55, compare);

        // Verify structure
        let current: SortedList<number> | undefined = list;
        while (current) {
            expect(current.items.length).toBeLessThanOrEqual(32);
            current = current.next;
        }

        // Verify items are all there and sorted
        const allItems = toArray(list);
        expect(allItems).toContain(55);

        let previous: number | undefined;
        each(list, (item) => {
            if (previous !== undefined) {
                expect(item).toBeGreaterThan(previous);
            }
            previous = item;
        });
    });

    describe("insertAll", () => {
        const compare = (a: number, b: number) => {
            if (a < b) return CompareResult.Less;
            if (a > b) return CompareResult.Greater;
            return CompareResult.Equal;
        };

        it("should handle empty array", () => {
            const list = insertAll(emptyList, [], compare);
            expect(toArray(list)).toEqual([]);
        });

        it("should insert a single item", () => {
            const list = insertAll(emptyList, [10], compare);
            expect(toArray(list)).toEqual([10]);
        });

        it("should insert multiple items unsorted", () => {
            const list = insertAll(emptyList, [30, 10, 20], compare);
            expect(toArray(list)).toEqual([10, 20, 30]);
        });

        it("should replace existing items if equal", () => {
            const obj10 = { val: 10, tag: "old10" };
            const obj20 = { val: 20, tag: "old20" };
            const obj30 = { val: 30, tag: "old30" };

            const compareObj = (a: { val: number }, b: { val: number }) => {
                if (a.val < b.val) return CompareResult.Less;
                if (a.val > b.val) return CompareResult.Greater;
                return CompareResult.Equal;
            };

            let list = insertAll(emptyList, [obj10, obj20, obj30], compareObj);

            const obj20new = { val: 20, tag: "new20" };
            const obj40 = { val: 40, tag: "new40" };

            list = insertAll(list, [obj40, obj20new], compareObj);

            const result = toArray(list);
            expect(result.map((o) => o.val)).toEqual([10, 20, 30, 40]);
            expect(result[1]).toBe(obj20new);
            expect(result[3]).toBe(obj40);
        });

        it("should handle items before, inside, and after current chunks", () => {
            // Create a list with multiple chunks
            let list: SortedList<number> = emptyList;
            const initialItems = [];
            for (let i = 100; i < 200; i += 2) {
                initialItems.push(i);
            }
            list = insertAll(list, initialItems, compare);

            // Verify we have multiple chunks (CHUNK_SIZE is 32)
            // 50 items / 32 = 2 chunks

            const newItems = [50, 60, 151, 153, 250, 260];
            list = insertAll(list, newItems, compare);

            const result = toArray(list);
            expect(result).toEqual(
                [...new Set([...initialItems, ...newItems])].sort(
                    (a, b) => a - b,
                ),
            );

            // Items are: 50, 60, 100, 102, ..., 150, 151, 152, 153, 154, ..., 198, 250, 260
            expect(result[0]).toBe(50);
            expect(result[result.length - 1]).toBe(260);
            expect(result).toContain(151);
            expect(result).toContain(153);
        });

        it("should not modify input array", () => {
            const input = [30, 10, 20];
            const inputCopy = [...input];
            insertAll(emptyList, input, compare);
            expect(input).toEqual(inputCopy);
        });

        it("should be efficient for large number of items", () => {
            let list: SortedList<number> = emptyList;
            const items = [];
            for (let i = 0; i < 1000; i++) {
                items.push(Math.floor(Math.random() * 10000));
            }
            list = insertAll(list, items, compare);

            const result = toArray(list);
            expect(result).toEqual([...new Set(items)].sort((a, b) => a - b));

            // Verify chunk sizes
            let current: SortedList<number> | undefined = list;
            while (current) {
                expect(current.items.length).toBeLessThanOrEqual(32);
                current = current.next;
            }
        });

        it("should return the same list if inserting nothing or exactly same items", () => {
            const list = insertAll(emptyList, [10, 20, 30], compare);
            const list2 = insertAll(list, [], compare);
            expect(list2).toBe(list);

            // Let's test the identity if items are exactly the same (===)
            const items = [10, 20, 30];
            const list3 = insertAll(list, items, compare);
            expect(list3).toBe(list);
        });

        it("should return the same list if inserting same items into a multichunk list", () => {
            const items = [];
            for (let i = 0; i < 100; i++) {
                items.push(i);
            }
            const list = insertAll(emptyList, items, compare);

            // Re-inserting all items
            const list2 = insertAll(list, items, compare);
            expect(list2).toBe(list);

            // Re-inserting a subset that matches exactly (identities)
            const subset = items.slice(10, 50);
            const list3 = insertAll(list, subset, compare);
            expect(list3).toBe(list);
        });
    });
});
