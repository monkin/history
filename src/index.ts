const CHUNK_SIZE = 32;

interface Item {
    id: string;
    parent: string | undefined;
}

export class History<T extends Item> {
    constructor(
        private items: T[],
        private next: History<T> | undefined,
    ) {}
}
