"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { HiOutlinePlus } from "react-icons/hi2";
import type { ListItem } from "@/app/types";
import RankedListCard from "./RankedListCard";

type Props = {
  initialItems: ListItem[];
  onStar?: (id: string, starred: boolean) => void;
};

export default function RankedList({ initialItems, onStar }: Props) {
  const [items, setItems] = useState<ListItem[]>(initialItems);

  // 親（insights）が initialItems.starred を更新した時、ローカル items の
  // starred フィールドだけ同期する。テキスト編集や並び替えは保持。
  useEffect(() => {
    setItems((prev) =>
      prev.map((p) => {
        const upstream = initialItems.find((i) => i.id === p.id);
        return upstream ? { ...p, starred: upstream.starred } : p;
      })
    );
  }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleEdit = (id: string, text: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAdd = () => {
    const newItem: ListItem = {
      id: crypto.randomUUID(),
      text: "新しい項目",
    };
    setItems((prev) => [...prev, newItem]);
  };

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item, index) => (
            <RankedListCard
              key={item.id}
              item={item}
              rank={index + 1}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStar={onStar}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={handleAdd}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
      >
        <HiOutlinePlus className="h-4 w-4" />
        追加
      </button>
    </div>
  );
}
