import { sortkey } from "@myandrienko/sortkey";
import { humanId } from "human-id";
import { useState } from "react";
import {
  DropIndicator,
  ListBox,
  ListBoxItem,
  useDragAndDrop,
} from "react-aria-components";

interface SortableItem {
  id: string;
  skey: string;
}

export function SortkeyDemo() {
  const [items, setItems] = useState(() => seedSortableItems(7));

  let { dragAndDropHooks } = useDragAndDrop({
    getItems(keys) {
      return [...keys].map((k) => ({
        "text/plain": items.find((item) => item.id === k)!.skey,
      }));
    },
    onReorder(event) {
      const i = items.findIndex((item) => item.id === event.target.key);
      const [ia, ib] =
        event.target.dropPosition === "before" ? [i - 1, i] : [i, i + 1];
      const skeys = distributeSorkeys(
        event.keys.size,
        items[ia]?.skey,
        items[ib]?.skey
      );
      setItems((items) =>
        items
          .map((item) =>
            event.keys.has(item.id)
              ? {
                  ...item,
                  skey: skeys.shift()!,
                }
              : item
          )
          .sort((a, b) => (a.skey < b.skey ? -1 : +1))
      );
    },
    renderDropIndicator(target) {
      return <DropIndicator target={target} className="drop-indicator" />;
    },
  });

  return (
    <ListBox
      aria-label="Reorderable List"
      items={items}
      dragAndDropHooks={dragAndDropHooks}
      className="list"
    >
      {(item) => (
        <ListBoxItem key={item.id} textValue={item.id} className="item">
          {item.id} <em>{item.skey}</em>
        </ListBoxItem>
      )}
    </ListBox>
  );
}

function seedSortableItems(count: number) {
  const skeys = distributeSorkeys(count);
  const items: SortableItem[] = [];

  for (let i = 0; i < count; i++) {
    items.push({
      id: humanId({ separator: " " }),
      skey: skeys[i],
    });
  }

  return items;
}

/**
 * Generates a requested amount of sortkeys between "a" and "b" that are more
 * or less evenly distributed.
 */
function distributeSorkeys(count: number, a?: string, b?: string): string[] {
  const skeys = [a, b];
  const continuing = () => skeys.length - 2 < count;

  while (continuing()) {
    for (let i = 1; i < skeys.length && continuing(); i += 2) {
      skeys.splice(i, 0, sortkey(skeys[i - 1], skeys[i]));
    }
  }

  return skeys.slice(1, -1) as string[];
}
