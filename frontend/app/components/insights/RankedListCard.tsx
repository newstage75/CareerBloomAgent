"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  HiOutlineBars3,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi2";
import type { ListItem } from "@/app/types";

type Props = {
  item: ListItem;
  rank: number;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
};

export default function RankedListCard({ item, rank, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const handleConfirm = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== item.text) {
      onEdit(item.id, trimmed);
    } else {
      setDraft(item.text);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(item.text);
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 ${
        isDragging ? "z-50 shadow-lg opacity-90" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <HiOutlineBars3 className="h-5 w-5" />
      </button>

      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
        {rank}
      </span>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm();
              if (e.key === "Escape") handleCancel();
            }}
            onBlur={handleConfirm}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
          />
        ) : (
          <p className="truncate text-sm text-gray-800">{item.text}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <HiOutlinePencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
        >
          <HiOutlineTrash className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
