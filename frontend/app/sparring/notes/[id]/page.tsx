"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineSparkles } from "react-icons/hi2";
import { apiFetch } from "@/app/lib/api";
import type { SparringNote } from "@/app/types";

export default function SparringNoteDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [note, setNote] = useState<SparringNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<SparringNote>(`/api/sparring/notes/${id}`)
      .then(setNote)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/sparring/notes"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <HiOutlineArrowLeft className="h-4 w-4" />
        ノート一覧へ戻る
      </Link>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : note ? (
        <article className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
          <header>
            <h1 className="text-2xl font-bold text-gray-900">{note.title}</h1>
            {note.summary && (
              <p className="mt-2 text-sm text-gray-600">{note.summary}</p>
            )}
            <p className="mt-2 text-[11px] text-gray-400">
              {new Date(note.generated_at).toLocaleString("ja-JP")}
            </p>
          </header>

          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
            {note.body}
          </div>

          {note.related_questions && note.related_questions.length > 0 && (
            <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <h2 className="mb-2 flex items-center gap-1 text-sm font-semibold text-amber-800">
                <HiOutlineSparkles className="h-4 w-4" />
                次に深掘りする問い
              </h2>
              <ul className="space-y-1.5 text-sm text-amber-900">
                {note.related_questions.map((q, i) => (
                  <li key={i}>• {q}</li>
                ))}
              </ul>
            </section>
          )}
        </article>
      ) : null}
    </div>
  );
}
