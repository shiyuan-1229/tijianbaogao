type TaskFiltersProps = {
  counts: {
    all: number;
    daily: number;
    weekly: number;
  };
  query: string;
  selectedType: "all" | "daily" | "weekly";
  onQueryChange: (value: string) => void;
  onTypeChange: (value: "all" | "daily" | "weekly") => void;
};

const filterOptions = [
  { value: "all", label: "全部任务" },
  { value: "daily", label: "日报" },
  { value: "weekly", label: "周报" },
] as const;

export function TaskFilters({
  counts,
  query,
  selectedType,
  onQueryChange,
  onTypeChange,
}: TaskFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((option) => {
          const active = option.value === selectedType;
          const count =
            option.value === "all" ? counts.all : counts[option.value];

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onTypeChange(option.value)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "border-[rgb(var(--accent))] bg-[rgba(var(--accent),0.12)] text-[rgb(var(--accent))]"
                  : "border-border bg-surface/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label} ({count})
            </button>
          );
        })}
      </div>
      <label className="block">
        <span className="sr-only">搜索任务</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索任务"
          className="w-full rounded-2xl border border-border bg-surface/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgba(var(--accent),0.15)]"
        />
      </label>
    </div>
  );
}
