import { describe, expect, it } from "vitest";
import { CHUNK_SIZE, List } from "./list.ts";

interface MyItem {
    id: number;
    previous: number | undefined;
}

function createItem(id: number, previous?: number): MyItem {
    return { id, previous };
}

describe("List", () => {
    it("should handle simple insertions and ordering", () => {
        let list = new List<number, MyItem>([], undefined);
        const item1 = createItem(10);
        const item2 = createItem(20);
        const item3 = createItem(5);

        list = list.insert(item1);
        expect(list.has(10)).toBe(true);
        expect(list.get(10)).toBe(item1);
        expect(list.isValid()).toBe(true);

        list = list.insert(item2);
        expect(list.has(20)).toBe(true);
        expect(list.get(20)).toBe(item2);
        expect(list.isValid()).toBe(true);
        // descending order: [20, 10]
        const items = Array.from(list);
        expect(items).toEqual([item2, item1]);

        list = list.insert(item3);
        expect(list.has(5)).toBe(true);
        expect(list.get(5)).toBe(item3);
        expect(list.isValid()).toBe(true);
        expect(Array.from(list)).toEqual([item2, item1, item3]);
    });

    it("should handle replacement correctly", () => {
        let list = new List<number, MyItem>([], undefined);
        const item1 = createItem(10);
        const item2 = createItem(5);
        const item1_v2 = createItem(10, 5);

        list = list.insert(item1);
        list = list.insert(item2);

        const list_v2 = list.insert(item1);
        expect(list).toBe(list_v2);

        const list_v3 = list.insert(item1_v2);
        expect(list).not.toBe(list_v3);
        expect(list_v3.get(10)).toBe(item1_v2);
        expect(list_v3.isValid()).toBe(true);
    });

    it("should handle chunking across many insertions", () => {
        let list = new List<number, MyItem>([], undefined);

        // Insert 100 items
        for (let i = 0; i < 100; i++) {
            list = list.insert(createItem(i));
        }

        expect(list.isValid()).toBe(true);

        // Check that we have multiple chunks
        let chunks = 0;
        let curr: List<number, MyItem> | undefined = list;
        while (curr) {
            chunks++;
            expect(curr.items.length).toBeLessThanOrEqual(CHUNK_SIZE);
            curr = curr.previous;
        }
        expect(chunks).toBeGreaterThanOrEqual(4);

        // Check all items are there
        for (let i = 0; i < 100; i++) {
            expect(list.has(i)).toBe(true);
        }

        // Check order (should be descending: 99, 98, ..., 0)
        const items = Array.from(list);
        for (let i = 0; i < 100; i++) {
            expect(items[i].id).toBe(99 - i);
        }
    });

    it("should handle edge cases", () => {
        let list = new List<number, MyItem>([], undefined);

        // Insert middle
        list = list.insert(createItem(10));
        list = list.insert(createItem(5));
        list = list.insert(createItem(7));

        expect(Array.from(list).map((i) => i.id)).toEqual([10, 7, 5]);
        expect(list.isValid()).toBe(true);

        // Overflow by inserting at start
        list = new List<number, MyItem>([], undefined);
        for (let i = 0; i < CHUNK_SIZE; i++) {
            list = list.insert(createItem(i));
        }
        expect(list.items.length).toBe(CHUNK_SIZE);

        list = list.insert(createItem(CHUNK_SIZE)); // Insert id CHUNK_SIZE at start
        expect(list.items.length).toBe(1);
        expect(list.previous).toBeDefined();
        expect(list.previous?.items.length).toBe(CHUNK_SIZE);
        expect(list.isValid()).toBe(true);
        expect(list.get(0)?.id).toBe(0);
        expect(list.get(CHUNK_SIZE)?.id).toBe(CHUNK_SIZE);
    });

    describe("insertAll", () => {
        it("should return the same list when inserting an empty array", () => {
            const list = new List<number, MyItem>([], undefined);
            const result = list.insertAll([]);
            expect(result).toBe(list);
        });

        it("should insert items into an empty list and maintain descending order", () => {
            const list = new List<number, MyItem>([], undefined);
            const items = [createItem(10), createItem(20), createItem(5)];
            const result = list.insertAll(items);
            expect(Array.from(result)).toEqual([items[1], items[0], items[2]]);
            expect(result.isValid()).toBe(true);
        });

        it("should insert items into a non-empty list and merge correctly", () => {
            const initialItem1 = createItem(15);
            const initialItem2 = createItem(5);
            const list = new List<number, MyItem>([], undefined).insertAll([
                initialItem1,
                initialItem2,
            ]);

            const newItem1 = createItem(20);
            const newItem2 = createItem(10);
            const result = list.insertAll([newItem1, newItem2]);

            expect(Array.from(result)).toEqual([
                newItem1,
                initialItem1,
                newItem2,
                initialItem2,
            ]);
            expect(result.isValid()).toBe(true);
        });

        it("should handle replacements in insertAll", () => {
            const item1 = createItem(10);
            const item2 = createItem(5);
            const list = new List<number, MyItem>([], undefined).insertAll([
                item1,
                item2,
            ]);

            const item1_v2 = createItem(10, 5); // now it has a valid previous (5 is in list)
            const item3 = createItem(15);

            const result = list.insertAll([item1_v2, item3]);
            expect(Array.from(result)).toEqual([item3, item1_v2, item2]);
            expect(result.isValid()).toBe(true);
        });

        it("should handle mixed insertion and replacement across chunks", () => {
            const initialItems: MyItem[] = [];
            for (let i = 0; i < CHUNK_SIZE; i++) {
                initialItems.push(createItem(i * 10));
            }
            const list = new List<number, MyItem>([], undefined).insertAll(
                initialItems,
            );

            const newItems: MyItem[] = [];
            for (let i = 0; i < CHUNK_SIZE; i++) {
                newItems.push(createItem(i * 10 + 5)); // new items
                newItems.push(createItem(i * 10)); // replacements
            }

            const result = list.insertAll(newItems);
            expect(result.isValid()).toBe(true);

            const allItems = Array.from(result);
            expect(allItems.length).toBe(CHUNK_SIZE * 2);

            // Expected order: descending
            const expected: MyItem[] = [];
            for (let i = CHUNK_SIZE - 1; i >= 0; i--) {
                expected.push(newItems[i * 2]); // i*10 + 5
                expected.push(newItems[i * 2 + 1]); // i*10
            }
            expect(allItems).toEqual(expected);
        });

        it("should handle inserting more than CHUNK_SIZE items into an empty list", () => {
            const items: MyItem[] = [];
            for (let i = 0; i < CHUNK_SIZE + 10; i++) {
                items.push(createItem(i));
            }
            const result = new List<number, MyItem>([], undefined).insertAll(
                items,
            );
            expect(result.isValid()).toBe(true);
            expect(Array.from(result).length).toBe(CHUNK_SIZE + 10);
            expect(result.previous).toBeDefined();
        });

        it("should handle inserting items that are all larger than current maxId", () => {
            const list = new List<number, MyItem>([], undefined).insertAll([
                createItem(10),
                createItem(5),
            ]);
            const newItems = [createItem(30), createItem(20)];
            const result = list.insertAll(newItems);
            expect(Array.from(result)).toEqual([
                newItems[0],
                newItems[1],
                createItem(10),
                createItem(5),
            ]);
            expect(result.isValid()).toBe(true);
        });

        it("should handle inserting items that are all smaller than current minId", () => {
            const list = new List<number, MyItem>([], undefined).insertAll([
                createItem(30),
                createItem(20),
            ]);
            const newItems = [createItem(10), createItem(5)];
            const result = list.insertAll(newItems);
            expect(Array.from(result)).toEqual([
                createItem(30),
                createItem(20),
                newItems[0],
                newItems[1],
            ]);
            expect(result.isValid()).toBe(true);
        });

        it("should handle duplicate IDs in input array by keeping all of them (results in invalid list)", () => {
            const list = new List<number, MyItem>([], undefined);
            const item1 = createItem(10, 1);
            const item1_alt = createItem(10, 2);

            const result = list.insertAll([item1, item1_alt]);
            expect(Array.from(result).length).toBe(2);
            expect(result.isValid()).toBe(false);
        });

        it("should handle inserting into a list with multiple chunks", () => {
            const items: MyItem[] = [];
            for (let i = 0; i < 100; i++) {
                items.push(createItem(i * 10));
            }
            const list = new List<number, MyItem>([], undefined).insertAll(
                items,
            );

            const newItem1 = createItem(995); // Largest
            const newItem2 = createItem(505); // Middle
            const newItem3 = createItem(5); // Smallest

            const result = list.insertAll([newItem1, newItem2, newItem3]);
            expect(result.isValid()).toBe(true);

            const expected = [
                newItem1,
                ...items.slice().reverse(),
                newItem2,
                newItem3,
            ].sort((a, b) => b.id - a.id);
            expect(Array.from(result)).toEqual(expected);
        });

        it("should return the same list when inserted items are already present", () => {
            const item1 = createItem(20);
            const item2 = createItem(10);
            const item3 = createItem(5);
            const list = new List<number, MyItem>([], undefined).insertAll([
                item1,
                item2,
                item3,
            ]);

            // Inserting same instances
            const result = list.insertAll([item1, item2, item3]);
            expect(result).toBe(list);

            // Inserting some subset
            const result2 = list.insertAll([item1, item3]);
            expect(result2).toBe(list);
        });

        it("should return the same list when inserted items are identical to existing even with different order", () => {
            const item1 = createItem(20);
            const item2 = createItem(10);
            const item3 = createItem(5);
            const list = new List<number, MyItem>([], undefined).insertAll([
                item1,
                item2,
                item3,
            ]);

            const result = list.insertAll([item3, item1, item2]);
            expect(result).toBe(list);
        });

        it("should handle inserting exactly 33 items (CHUNK_SIZE + 1) into an empty list", () => {
            const items: MyItem[] = [];
            for (let i = 0; i < CHUNK_SIZE + 1; i++) {
                items.push(createItem(i));
            }
            const result = new List<number, MyItem>([], undefined).insertAll(
                items,
            );
            expect(result.isValid()).toBe(true);
            expect(Array.from(result).length).toBe(CHUNK_SIZE + 1);
            expect(result.items.length).toBe(1); // Head should have 1 item
            expect(result.previous?.items.length).toBe(CHUNK_SIZE); // Previous should have 32
        });

        it("should handle inserting exactly 64 items (2 * CHUNK_SIZE) into an empty list", () => {
            const items: MyItem[] = [];
            for (let i = 0; i < CHUNK_SIZE * 2; i++) {
                items.push(createItem(i));
            }
            const result = new List<number, MyItem>([], undefined).insertAll(
                items,
            );
            expect(result.isValid()).toBe(true);
            expect(Array.from(result).length).toBe(CHUNK_SIZE * 2);
            expect(result.items.length).toBe(CHUNK_SIZE);
            expect(result.previous?.items.length).toBe(CHUNK_SIZE);
            expect(result.previous?.previous).toBeUndefined();
        });

        it("should handle inserting 200 items into an empty list", () => {
            const items: MyItem[] = [];
            for (let i = 0; i < 200; i++) {
                items.push(createItem(i));
            }
            const result = new List<number, MyItem>([], undefined).insertAll(
                items,
            );
            expect(result.isValid()).toBe(true);
            expect(Array.from(result).length).toBe(200);

            // Check that we have multiple chunks
            let chunks = 0;
            let curr: List<number, MyItem> | undefined = result;
            while (curr) {
                chunks++;
                expect(curr.items.length).toBeLessThanOrEqual(CHUNK_SIZE);
                curr = curr.previous;
            }
            expect(chunks).toBe(Math.ceil(200 / CHUNK_SIZE));
        });

        it("should handle inserting 100 items with replacements into an existing multi-chunk list", () => {
            // Setup a list with 100 items: [99, 98, ..., 0]
            const initialItems: MyItem[] = [];
            for (let i = 0; i < 100; i++) {
                initialItems.push(createItem(i));
            }
            const list = new List<number, MyItem>([], undefined).insertAll(
                initialItems,
            );

            // New items: [150, 149, ..., 0]
            // This will add 51 new items and replace 100 existing items
            const newItems: MyItem[] = [];
            for (let i = 0; i <= 150; i++) {
                newItems.push(createItem(i, i > 0 ? i - 1 : undefined));
            }

            const result = list.insertAll(newItems);
            expect(result.isValid()).toBe(true);
            expect(Array.from(result).length).toBe(151);

            // Verify that all items have the updated 'previous' field
            for (const item of result) {
                if (item.id > 0) {
                    expect(item.previous).toBe(item.id - 1);
                } else {
                    expect(item.previous).toBeUndefined();
                }
            }
        });
    });
});
