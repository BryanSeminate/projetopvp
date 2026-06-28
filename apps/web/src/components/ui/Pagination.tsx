interface Props {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="text-gray-400">{total} registro(s)</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40"
        >
          ‹ Anterior
        </button>
        <span className="text-gray-600">{page} / {totalPages}</span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40"
        >
          Próxima ›
        </button>
      </div>
    </div>
  );
}
