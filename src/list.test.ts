import { describe, expect, it } from "vitest";
import type { Entry } from "./entry";
import { CHUNK_SIZE, List } from "./list.ts";

interface MyEntry extends Entry<number, string> {
    id: number;
    previous: number | undefined;
    operation: string;
}

function createItem(
    id: number,
    previous?: number,
    value: string = "test",
): MyEntry {
    return { id, previous, operation: value };
}

describe("List", () => {
    describe("insert", () => {
        it("should insert items and maintain descending order by ID", () => {
            let list = new List<MyEntry>([], undefined);
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

        it("should replace an item with the same ID but different content", () => {
            let list = new List<MyEntry>([], undefined);
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

        it("should split into multiple chunks when inserting more than CHUNK_SIZE items", () => {
            let list = new List<MyEntry>([], undefined);

            // Insert 100 items
            for (let i = 0; i < 100; i++) {
                list = list.insert(createItem(i));
            }

            expect(list.isValid()).toBe(true);

            // Check that we have multiple chunks
            let chunks = 0;
            let curr: List<MyEntry> | undefined = list;
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

        it("should insert items in the middle of a chunk and maintain order", () => {
            let list = new List<MyEntry>([], undefined);

            list = list.insert(createItem(10));
            list = list.insert(createItem(5));
            list = list.insert(createItem(7));

            expect(Array.from(list).map((i) => i.id)).toEqual([10, 7, 5]);
            expect(list.isValid()).toBe(true);
        });

        it("should create a new chunk when inserting an item larger than maxId into a full chunk", () => {
            let list = new List<MyEntry>([], undefined);
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

        it("should create a new previous chunk when inserting an item smaller than minId into a full chunk", () => {
            let list = new List<MyEntry>([], undefined);
            for (let i = 1; i <= CHUNK_SIZE; i++) {
                list = list.insert(createItem(i));
            }
            // items: [32, 31, ..., 1]
            expect(list.items.length).toBe(CHUNK_SIZE);

            list = list.insert(createItem(0));
            expect(list.items.length).toBe(CHUNK_SIZE);
            expect(list.previous?.items.length).toBe(1);
            expect(list.previous?.items[0].id).toBe(0);
            expect(list.isValid()).toBe(true);
        });

        it("should split a full chunk when inserting an item into its middle", () => {
            let list = new List<MyEntry>([], undefined);
            for (let i = 0; i < CHUNK_SIZE; i++) {
                list = list.insert(createItem(i * 10));
            }
            // items: [310, 300, ..., 0]
            expect(list.items.length).toBe(CHUNK_SIZE);
            expect(list.previous).toBeUndefined();

            const middleItem = createItem(155);
            list = list.insert(middleItem);

            expect(list.isValid()).toBe(true);
            expect(list.has(155)).toBe(true);
            // It should have split
            expect(list.previous).toBeDefined();
            expect(Array.from(list).map((i) => i.id)).toContain(155);
        });

        it("should insert an item into the appropriate older chunk based on its ID", () => {
            let list = new List<MyEntry>([], undefined);
            for (let i = 0; i < 100; i++) {
                list = list.insert(createItem(i * 10));
            }
            // head chunk should be around [990, ..., 990 - (CHUNK_SIZE-1)*10]
            const oldItem = createItem(55); // belongs to a much older chunk
            const newList = list.insert(oldItem);

            expect(newList.has(55)).toBe(true);
            expect(newList.isValid()).toBe(true);
            expect(newList.get(55)).toBe(oldItem);

            // Ensure it didn't just prepend to head
            expect(newList.items[0].id).toBe(990);
        });

        it("should correctly replace the first or last item within a chunk", () => {
            let list = new List<MyEntry>([], undefined);
            for (let i = 0; i < CHUNK_SIZE; i++) {
                list = list.insert(createItem(i));
            }
            // items: [31, 30, ..., 0]

            const firstId = 31;
            const lastId = 0;

            const newFirst = createItem(firstId, 30);
            const newLast = createItem(lastId, undefined);

            list = list.insert(newFirst);
            expect(list.get(firstId)).toBe(newFirst);

            list = list.insert(newLast);
            expect(list.get(lastId)).toBe(newLast);

            expect(list.isValid()).toBe(true);
        });

        it("should correctly replace an item in an older chunk", () => {
            let list = new List<MyEntry>([], undefined);
            for (let i = 0; i < 100; i++) {
                list = list.insert(createItem(i * 10));
            }
            const oldId = 50;
            const updatedOldItem = createItem(oldId, 40);
            const newList = list.insert(updatedOldItem);

            expect(newList.get(oldId)).toBe(updatedOldItem);
            expect(newList.isValid()).toBe(true);
        });
    });

    describe("insertAll", () => {
        it("should return the same list when inserting an empty array", () => {
            const list = new List<MyEntry>([], undefined);
            const result = list.insertAll([]);
            expect(result).toBe(list);
        });

        it("should insert items into an empty list and maintain descending order", () => {
            const list = new List<MyEntry>([], undefined);
            const items = [createItem(10), createItem(20), createItem(5)];
            const result = list.insertAll(items);
            expect(Array.from(result)).toEqual([items[1], items[0], items[2]]);
            expect(result.isValid()).toBe(true);
        });

        it("should insert items into a non-empty list and merge correctly", () => {
            const initialItem1 = createItem(15);
            const initialItem2 = createItem(5);
            const list = new List<MyEntry>([], undefined).insertAll([
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

        it("should replace multiple existing items when using insertAll", () => {
            const item1 = createItem(10);
            const item2 = createItem(5);
            const list = new List<MyEntry>([], undefined).insertAll([
                item1,
                item2,
            ]);

            const item1_v2 = createItem(10, 5); // now it has a valid previous (5 is in list)
            const item3 = createItem(15);

            const result = list.insertAll([item1_v2, item3]);
            expect(Array.from(result)).toEqual([item3, item1_v2, item2]);
            expect(result.isValid()).toBe(true);
        });

        it("should handle a mix of new items and replacements spanning multiple chunks in insertAll", () => {
            const initialItems: MyEntry[] = [];
            for (let i = 0; i < CHUNK_SIZE; i++) {
                initialItems.push(createItem(i * 10));
            }
            const list = new List<MyEntry>([], undefined).insertAll(
                initialItems,
            );

            const newItems: MyEntry[] = [];
            for (let i = 0; i < CHUNK_SIZE; i++) {
                newItems.push(createItem(i * 10 + 5)); // new items
                newItems.push(createItem(i * 10)); // replacements
            }

            const result = list.insertAll(newItems);
            expect(result.isValid()).toBe(true);

            const allItems = Array.from(result);
            expect(allItems.length).toBe(CHUNK_SIZE * 2);

            // Expected order: descending
            const expected: MyEntry[] = [];
            for (let i = CHUNK_SIZE - 1; i >= 0; i--) {
                expected.push(newItems[i * 2]); // i*10 + 5
                expected.push(newItems[i * 2 + 1]); // i*10
            }
            expect(allItems).toEqual(expected);
        });

        it("should split into multiple chunks when insertAll receives more than CHUNK_SIZE items", () => {
            const items: MyEntry[] = [];
            for (let i = 0; i < CHUNK_SIZE + 10; i++) {
                items.push(createItem(i));
            }
            const result = new List<MyEntry>([], undefined).insertAll(items);
            expect(result.isValid()).toBe(true);
            expect(Array.from(result).length).toBe(CHUNK_SIZE + 10);
            expect(result.previous).toBeDefined();
        });

        it("should prepend new chunks when all items in insertAll are larger than the current maxId", () => {
            const list = new List<MyEntry>([], undefined).insertAll([
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

        it("should append to the end when all items in insertAll are smaller than the current minId", () => {
            const list = new List<MyEntry>([], undefined).insertAll([
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

        it("should include all items when input to insertAll contains duplicate IDs, even if it results in an invalid list", () => {
            const list = new List<MyEntry>([], undefined);
            const item1 = createItem(10, 1);
            const item1_alt = createItem(10, 2);

            const result = list.insertAll([item1, item1_alt]);
            expect(Array.from(result).length).toBe(2);
            expect(result.isValid()).toBe(false);
        });

        it("should correctly distribute items across multiple existing chunks in insertAll", () => {
            const items: MyEntry[] = [];
            for (let i = 0; i < 100; i++) {
                items.push(createItem(i * 10));
            }
            const list = new List<MyEntry>([], undefined).insertAll(items);

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

        it("should return the same list instance when all inserted items are already present", () => {
            const item1 = createItem(20);
            const item2 = createItem(10);
            const item3 = createItem(5);
            const list = new List<MyEntry>([], undefined).insertAll([
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

        it("should return the same list instance when inserted items match existing items regardless of input order", () => {
            const item1 = createItem(20);
            const item2 = createItem(10);
            const item3 = createItem(5);
            const list = new List<MyEntry>([], undefined).insertAll([
                item1,
                item2,
                item3,
            ]);

            const result = list.insertAll([item3, item1, item2]);
            expect(result).toBe(list);
        });

        it("should create two chunks when inserting exactly CHUNK_SIZE + 1 items with insertAll", () => {
            const items: MyEntry[] = [];
            for (let i = 0; i < CHUNK_SIZE + 1; i++) {
                items.push(createItem(i));
            }
            const result = new List<MyEntry>([], undefined).insertAll(items);
            expect(result.isValid()).toBe(true);
            expect(Array.from(result).length).toBe(CHUNK_SIZE + 1);
            expect(result.items.length).toBe(1); // Head should have 1 item
            expect(result.previous?.items.length).toBe(CHUNK_SIZE); // Previous should have 32
        });

        it("should create exactly two full chunks when inserting 2 * CHUNK_SIZE items with insertAll", () => {
            const items: MyEntry[] = [];
            for (let i = 0; i < CHUNK_SIZE * 2; i++) {
                items.push(createItem(i));
            }
            const result = new List<MyEntry>([], undefined).insertAll(items);
            expect(result.isValid()).toBe(true);
            expect(Array.from(result).length).toBe(CHUNK_SIZE * 2);
            expect(result.items.length).toBe(CHUNK_SIZE);
            expect(result.previous?.items.length).toBe(CHUNK_SIZE);
            expect(result.previous?.previous).toBeUndefined();
        });

        it("should split into appropriate number of chunks when inserting 200 items with insertAll", () => {
            const items: MyEntry[] = [];
            for (let i = 0; i < 200; i++) {
                items.push(createItem(i));
            }
            const result = new List<MyEntry>([], undefined).insertAll(items);
            expect(result.isValid()).toBe(true);
            expect(Array.from(result).length).toBe(200);

            // Check that we have multiple chunks
            let chunks = 0;
            let curr: List<MyEntry> | undefined = result;
            while (curr) {
                chunks++;
                expect(curr.items.length).toBeLessThanOrEqual(CHUNK_SIZE);
                curr = curr.previous;
            }
            expect(chunks).toBe(Math.ceil(200 / CHUNK_SIZE));
        });

        it("should correctly update multiple chunks when inserting many items with some replacements using insertAll", () => {
            // Setup a list with 100 items: [99, 98, ..., 0]
            const initialItems: MyEntry[] = [];
            for (let i = 0; i < 100; i++) {
                initialItems.push(createItem(i));
            }
            const list = new List<MyEntry>([], undefined).insertAll(
                initialItems,
            );

            // New items: [150, 149, ..., 0]
            // This will add 51 new items and replace 100 existing items
            const newItems: MyEntry[] = [];
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

    describe("iterate", () => {
        it("should iterate through a simple chain", () => {
            let list = new List<MyEntry>([], undefined);
            const item3 = createItem(3, 2);
            const item2 = createItem(2, 1);
            const item1 = createItem(1, undefined);

            list = list.insert(item1).insert(item2).insert(item3);

            const iterated = Array.from(list.iterate(3));
            expect(iterated).toEqual([item3, item2, item1]);
        });

        it("should skip unreferenced items", () => {
            let list = new List<MyEntry>([], undefined);
            const item3 = createItem(3, 1); // Skips 2
            const item2 = createItem(2, 0); // Unreferenced if we start from 3
            const item1 = createItem(1, undefined);

            list = list.insert(item1).insert(item2).insert(item3);

            const iterated = Array.from(list.iterate(3));
            expect(iterated).toEqual([item3, item1]);
        });

        it("should stop if item is not found", () => {
            let list = new List<MyEntry>([], undefined);
            const item1 = createItem(1, undefined);
            list = list.insert(item1);

            const iterated = Array.from(list.iterate(2));
            expect(iterated).toEqual([]);
        });

        it("should handle empty list", () => {
            const list = new List<MyEntry>([], undefined);
            const iterated = Array.from(list.iterate(1));
            expect(iterated).toEqual([]);
        });

        it("should handle ID 0 as a valid previous reference", () => {
            let list = new List<MyEntry>([], undefined);
            const item1 = createItem(1, 0);
            const item0 = createItem(0, undefined);

            list = list.insert(item0).insert(item1);

            const iterated = Array.from(list.iterate(1));
            expect(iterated).toEqual([item1, item0]);
        });

        it("should not yield items before the startFrom ID", () => {
            let list = new List<MyEntry>([], undefined);
            const item3 = createItem(3, 2);
            const item2 = createItem(2, 1);
            const item1 = createItem(1, undefined);

            list = list.insert(item1).insert(item2).insert(item3);

            const iterated = Array.from(list.iterate(2));
            expect(iterated).toEqual([item2, item1]);
        });

        it("should handle multi-chunk lists", () => {
            let list = new List<MyEntry>([], undefined);
            const count = CHUNK_SIZE * 3;
            const items: MyEntry[] = [];
            for (let i = 0; i < count; i++) {
                items.push(createItem(i, i > 0 ? i - 1 : undefined));
            }
            list = list.insertAll(items);

            const startFrom = count - 1;
            const iterated = Array.from(list.iterate(startFrom));
            expect(iterated.length).toBe(count);
            expect(iterated[0].id).toBe(count - 1);
            expect(iterated[count - 1].id).toBe(0);
        });
    });
});
