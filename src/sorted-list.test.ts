import { describe, expect, it } from "vitest";
import {
    Comparison,
    diff,
    each,
    emptyList,
    filter,
    getItem,
    insert,
    insertAll,
    iterate,
    type LookupFunction,
    remove,
    type SortedList,
    toArray,
} from "./sorted-list";

describe("SortedList", () => {
    const compare = (a: number, b: number) => {
        if (a < b) return Comparison.Less;
        if (a > b) return Comparison.Greater;
        return Comparison.Equal;
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
            if (a.val < b.val) return Comparison.Less;
            if (a.val > b.val) return Comparison.Greater;
            return Comparison.Equal;
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

        // Verify items are entries there and sorted
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

    it("should iterate over items", () => {
        const items = [10, 20, 30, 40, 50];
        const list = insertAll(emptyList, items, compare);
        const iterated = [];
        for (const item of iterate(list)) {
            iterated.push(item);
        }
        expect(iterated).toEqual(items);
    });

    it("should iterate over multi-chunk items", () => {
        const items = [];
        for (let i = 0; i < 100; i++) {
            items.push(i);
        }
        const list = insertAll(emptyList, items, compare);
        const iterated = Array.from(iterate(list));
        expect(iterated).toEqual(items);
    });

    describe("each", () => {
        it("should provide correct indexes for a single chunk", () => {
            const items = [10, 20, 30];
            const list = insertAll(emptyList, items, compare);
            const indexes: number[] = [];
            each(list, (_item, i) => {
                indexes.push(i);
            });
            expect(indexes).toEqual([0, 1, 2]);
        });

        it("should provide correct indexes for multi-chunk list", () => {
            const items = [];
            for (let i = 0; i < 100; i++) {
                items.push(i);
            }
            const list = insertAll(emptyList, items, compare);
            const resultItems: number[] = [];
            const resultIndexes: number[] = [];
            each(list, (item, i) => {
                resultItems.push(item);
                resultIndexes.push(i);
            });
            expect(resultItems).toEqual(items);
            expect(resultIndexes).toEqual(items.map((_, i) => i));
        });

        it("should not call callback for empty list", () => {
            let called = false;
            each(emptyList, () => {
                called = true;
            });
            expect(called).toBe(false);
        });
    });

    describe("insertAll", () => {
        const compare = (a: number, b: number) => {
            if (a < b) return Comparison.Less;
            if (a > b) return Comparison.Greater;
            return Comparison.Equal;
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
                if (a.val < b.val) return Comparison.Less;
                if (a.val > b.val) return Comparison.Greater;
                return Comparison.Equal;
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

        it("should return the same list if inserting same items into a multi-chunk list", () => {
            const items = [];
            for (let i = 0; i < 100; i++) {
                items.push(i);
            }
            const list = insertAll(emptyList, items, compare);

            // Re-inserting entries items
            const list2 = insertAll(list, items, compare);
            expect(list2).toBe(list);

            // Re-inserting a subset that matches exactly (identities)
            const subset = items.slice(10, 50);
            const list3 = insertAll(list, subset, compare);
            expect(list3).toBe(list);
        });
    });

    describe("getItem", () => {
        const createLookup =
            (target: number): LookupFunction<number> =>
            (value: number) => {
                if (target < value) return Comparison.Less;
                if (target > value) return Comparison.Greater;
                return Comparison.Equal;
            };

        it("should find an item in a single-chunk list", () => {
            const list = insertAll(emptyList, [10, 20, 30], compare);
            expect(getItem(list, createLookup(10))).toBe(10);
            expect(getItem(list, createLookup(20))).toBe(20);
            expect(getItem(list, createLookup(30))).toBe(30);
        });

        it("should return undefined if item is not in single-chunk list", () => {
            const list = insertAll(emptyList, [10, 20, 30], compare);
            expect(getItem(list, createLookup(5))).toBeUndefined();
            expect(getItem(list, createLookup(15))).toBeUndefined();
            expect(getItem(list, createLookup(35))).toBeUndefined();
        });

        it("should find an item in a multi-chunk list", () => {
            const items = [];
            for (let i = 0; i < 100; i++) items.push(i * 10);
            const list = insertAll(emptyList, items, compare);

            // Check items in different chunks
            expect(getItem(list, createLookup(0))).toBe(0); // first chunk, first item
            expect(getItem(list, createLookup(310))).toBe(310); // first chunk, last item (approx)
            expect(getItem(list, createLookup(320))).toBe(320); // second chunk, first item
            expect(getItem(list, createLookup(990))).toBe(990); // last chunk, last item
            expect(getItem(list, createLookup(500))).toBe(500); // middle chunk
        });

        it("should return undefined if item is not in multi-chunk list", () => {
            const items = [];
            for (let i = 0; i < 100; i++) items.push(i * 10);
            const list = insertAll(emptyList, items, compare);

            expect(getItem(list, createLookup(-5))).toBeUndefined();
            expect(getItem(list, createLookup(5))).toBeUndefined();
            expect(getItem(list, createLookup(315))).toBeUndefined();
            expect(getItem(list, createLookup(1000))).toBeUndefined();
        });

        it("should handle empty list", () => {
            expect(getItem(emptyList, createLookup(10))).toBeUndefined();
        });

        it("should work with objects", () => {
            const obj10 = { id: 10, name: "ten" };
            const obj20 = { id: 20, name: "twenty" };
            const compareObj = (a: { id: number }, b: { id: number }) => {
                if (a.id < b.id) return Comparison.Less;
                if (a.id > b.id) return Comparison.Greater;
                return Comparison.Equal;
            };
            const list = insertAll(
                emptyList as SortedList<{ id: number; name: string }>,
                [obj10, obj20],
                compareObj,
            );

            const lookup = (val: { id: number }) => {
                if (10 < val.id) return Comparison.Less;
                if (10 > val.id) return Comparison.Greater;
                return Comparison.Equal;
            };

            expect(getItem(list, lookup)).toBe(obj10);
        });
    });

    describe("remove", () => {
        const createLookup =
            (target: number): LookupFunction<number> =>
            (value: number) => {
                if (target < value) return Comparison.Less;
                if (target > value) return Comparison.Greater;
                return Comparison.Equal;
            };

        it("should remove an item in a single-chunk list", () => {
            const list = insertAll(emptyList, [10, 20, 30], compare);
            const updated = remove(list, createLookup(20));
            expect(toArray(updated)).toEqual([10, 30]);
            expect(updated).not.toBe(list);
        });

        it("should return the same list if item to remove is not in list", () => {
            const list = insertAll(emptyList, [10, 20, 30], compare);
            const updated = remove(list, createLookup(15));
            expect(updated).toBe(list);
        });

        it("should remove the first item in a chunk", () => {
            const list = insertAll(emptyList, [10, 20, 30], compare);
            const updated = remove(list, createLookup(10));
            expect(toArray(updated)).toEqual([20, 30]);
        });

        it("should remove the last item in a chunk", () => {
            const list = insertAll(emptyList, [10, 20, 30], compare);
            const updated = remove(list, createLookup(30));
            expect(toArray(updated)).toEqual([10, 20]);
        });

        it("should remove an item in a multi-chunk list", () => {
            const items = [];
            for (let i = 0; i < 100; i++) items.push(i * 10);
            const list = insertAll(emptyList, items, compare);

            // Removing item from middle chunk
            const updated = remove(list, createLookup(500));
            const resultItems = toArray(updated);
            expect(resultItems.length).toBe(99);
            expect(resultItems).not.toContain(500);
            expect(resultItems).toContain(490);
            expect(resultItems).toContain(510);
        });

        it("should handle empty list", () => {
            const updated = remove(emptyList, createLookup(10));
            expect(updated).toBe(emptyList);
        });
    });

    describe("filter", () => {
        it("should filter items", () => {
            const items = [10, 20, 30, 40, 50];
            const list = insertAll(emptyList, items, compare);
            const filtered = filter(list, (x: number) => x > 25);
            expect(toArray(filtered)).toEqual([30, 40, 50]);
        });

        it("should return empty list if entries items are filtered out", () => {
            const items = [10, 20, 30];
            const list = insertAll(emptyList, items, compare);
            const filtered = filter(list, (x: number) => x > 100);
            expect(toArray(filtered)).toEqual([]);
            expect(filtered).toBe(emptyList);
        });

        it("should return the same list if entries items match the predicate", () => {
            const items = [10, 20, 30];
            const list = insertAll(emptyList, items, compare);
            const filtered = filter(list, (x: number) => x > 0);
            expect(filtered).toBe(list);
        });

        it("should handle multi-chunk lists", () => {
            const items = [];
            for (let i = 0; i < 100; i++) {
                items.push(i);
            }
            const list = insertAll(emptyList, items, compare);
            const filtered = filter(list, (x: number) => x % 10 === 0);
            expect(toArray(filtered)).toEqual([
                0, 10, 20, 30, 40, 50, 60, 70, 80, 90,
            ]);
        });

        it("should handle empty list", () => {
            const filtered = filter(emptyList, (x: number) => x > 0);
            expect(filtered).toBe(emptyList);
        });
    });

    describe("diff", () => {
        it("should return an empty array for identical lists", () => {
            const list = insertAll(emptyList, [1, 2, 3], compare);
            expect(diff(list, list, compare)).toEqual([]);
        });

        it("should detect created elements", () => {
            const list1 = insertAll(emptyList, [1, 3], compare);
            const list2 = insertAll(emptyList, [1, 2, 3], compare);
            expect(diff(list1, list2, compare)).toEqual([[undefined, 2]]);
        });

        it("should detect deleted elements", () => {
            const list1 = insertAll(emptyList, [1, 2, 3], compare);
            const list2 = insertAll(emptyList, [1, 3], compare);
            expect(diff(list1, list2, compare)).toEqual([[2, undefined]]);
        });

        it("should detect updated elements", () => {
            const compareObj = (a: { id: number }, b: { id: number }) => {
                if (a.id < b.id) return Comparison.Less;
                if (a.id > b.id) return Comparison.Greater;
                return Comparison.Equal;
            };
            const obj1a = { id: 1, val: "a" };
            const obj1b = { id: 1, val: "b" };
            const obj2 = { id: 2, val: "c" };

            const list1 = insertAll(emptyList, [obj1a, obj2], compareObj);
            const list2 = insertAll(emptyList, [obj1b, obj2], compareObj);

            expect(diff(list1, list2, compareObj)).toEqual([[obj1a, obj1b]]);
        });

        it("should handle multi-chunk lists and reuse identical chunks", () => {
            const items1 = Array.from({ length: 100 }, (_, i) => i);

            const compareObj = (a: { id: number }, b: { id: number }) => {
                if (a.id < b.id) return Comparison.Less;
                if (a.id > b.id) return Comparison.Greater;
                return Comparison.Equal;
            };
            const itemsObj1 = items1.map((i) => ({ id: i, val: `v${i}` }));
            const listObj1 = insertAll(emptyList, itemsObj1, compareObj);

            const updatedItem = { id: 50, val: "v50-updated" };
            const listObj2 = insertAll(listObj1, [updatedItem], compareObj);

            const result = diff(listObj1, listObj2, compareObj);
            expect(result).toEqual([[itemsObj1[50], updatedItem]]);
        });

        it("should diff lists with 16 elements", () => {
            const items1 = Array.from({ length: 16 }, (_, i) => i);
            const items2 = Array.from({ length: 16 }, (_, i) => i + 100);

            const list1 = insertAll(emptyList, items1, compare);
            const list2 = insertAll(emptyList, items2, compare);

            const result = diff(list1, list2, compare);
            expect(result.length).toBe(32);
        });

        it("should diff lists with 48 elements", () => {
            const items1 = Array.from({ length: 48 }, (_, i) => i);
            const items2 = Array.from({ length: 48 }, (_, i) => i + 100);

            const list1 = insertAll(emptyList, items1, compare);
            const list2 = insertAll(emptyList, items2, compare);

            const result = diff(list1, list2, compare);
            expect(result.length).toBe(96);
        });
    });
});
