export type SList<T> = { value: T; next: SList<T> } | undefined;
type SNode<T> = { value: T; next: SList<T> };

export const enum LoopControl {
    Continue = 0,
    Break = 1,
}

export const slist = <T>(value: T, next?: SList<T>): SNode<T> => ({
    value,
    next,
});

export const prepend = <T>(value: T, list: SList<T>): SNode<T> => ({
    value,
    next: list,
});

const withNext = <T>(current: SNode<T>, next: SList<T>): SNode<T> =>
    current.next === next ? current : slist(current.value, next);

export const each = <T>(
    list: SList<T>,
    callback: (value: T) => LoopControl | undefined | void,
): void => {
    for (let node = list; node !== undefined; node = node.next) {
        const result = callback(node.value);
        if (result === LoopControl.Break) return;
    }
};

export const insertBefore = <T>(
    list: SList<T>,
    value: T,
    predicate: (value: T) => boolean,
): SNode<T> => {
    if (!list) return slist(value);
    if (predicate(list.value)) return prepend(value, list);

    return withNext(list, insertBefore(list.next, value, predicate));
};

export const insertAfter = <T>(
    list: SList<T>,
    value: T,
    predicate: (value: T) => boolean,
): SNode<T> => {
    if (!list) return slist(value);
    if (predicate(list.value)) return withNext(list, slist(value, list.next));

    return withNext(list, insertAfter(list.next, value, predicate));
};
