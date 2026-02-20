import { describe, expect, it } from "vitest";
import { List } from "./list.ts";

interface MyItem {
    id: number;
    previous: number | undefined;
}

const CHUNK_SIZE = 32;

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
        let curr: any = list;
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
        expect((list as any).items.length).toBe(CHUNK_SIZE);

        list = list.insert(createItem(CHUNK_SIZE)); // Insert id CHUNK_SIZE at start
        expect((list as any).items.length).toBe(CHUNK_SIZE);
        expect((list as any).previous).toBeDefined();
        expect(list.isValid()).toBe(true);
        expect(list.get(0)?.id).toBe(0);
        expect(list.get(CHUNK_SIZE)?.id).toBe(CHUNK_SIZE);
    });
});
