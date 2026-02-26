import { describe, expect, it } from "vitest";
import { History } from "./history.ts";
import { List } from "./list.ts";

interface MyEntry extends History.Entry<number, string> {
    id: number;
    previous: number | undefined;
    value: string;
}

function createItem(
    id: number,
    previous?: number,
    value: string = "test",
): MyEntry {
    return { id, previous, value };
}

describe("History", () => {
    it("should iterate through history starting from current", () => {
        const item1 = createItem(1);
        const item2 = createItem(2, 1);
        const item3 = createItem(3, 2);

        let list = new List<MyEntry>([], undefined);
        list = list.insert(item1).insert(item2).insert(item3);

        const generateId: History.KeyGenerator<MyEntry> = (maxId) =>
            ((maxId as number) ?? 0) + 1;

        const history = new History(list, 2, generateId);

        // Current is 2, so it should iterate 2 -> 1
        const iterated = Array.from(history);
        expect(iterated).toEqual([item2, item1]);
    });

    it("should iterate through everything if current is maxId", () => {
        const item1 = createItem(1);
        const item2 = createItem(2, 1);
        const item3 = createItem(3, 2);

        let list = new List<MyEntry>([], undefined);
        list = list.insert(item1).insert(item2).insert(item3);

        const generateId: History.KeyGenerator<MyEntry> = (maxId) =>
            ((maxId as number) ?? 0) + 1;

        const history = new History(list, 3, generateId);

        const iterated = Array.from(history);
        expect(iterated).toEqual([item3, item2, item1]);
    });

    it("should return empty if current is undefined", () => {
        const item1 = createItem(1);
        let list = new List<MyEntry>([], undefined);
        list = list.insert(item1);

        const generateId: History.KeyGenerator<MyEntry> = (maxId) =>
            ((maxId as number) ?? 0) + 1;

        const history = new History(list, undefined, generateId);

        const iterated = Array.from(history);
        expect(iterated).toEqual([]);
    });
});
