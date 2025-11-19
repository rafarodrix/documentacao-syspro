
"use client";

type FilterType = "all" | "melhoria" | "bug";

interface ReleasesFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export function ReleasesFilter({
  searchTerm,
  onSearchChange,
  activeFilter,
  onFilterChange,
}: ReleasesFilterProps) {
  const getButtonClass = (filter: FilterType) => {
    return activeFilter === filter
      ? "bg-primary text-primary-foreground"
      : "bg-muted text-muted-foreground hover:bg-muted/80";
  };

  return (
    <div className="mb-8 flex flex-col md:flex-row gap-4">
      <input
        type="text"
        placeholder="Buscar por ID ou palavra-chave..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-grow rounded-lg border bg-card p-2 text-foreground"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => onFilterChange("all")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${getButtonClass("all")}`}
        >
          Todos
        </button>
        <button
          onClick={() => onFilterChange("melhoria")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${getButtonClass("melhoria")}`}
        >
          Melhorias
        </button>
        <button
          onClick={() => onFilterChange("bug")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${getButtonClass("bug")}`}
        >
          Bugs
        </button>
      </div>
    </div>
  );
}