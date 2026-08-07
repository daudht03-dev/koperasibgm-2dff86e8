/**
 * Mobile-friendly searchable select.
 * Uses Popover + Command (modal) so it renders correctly inside dialogs on
 * Android where a plain <Select> list can be clipped off-screen.
 */
import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SearchableOption {
  value: string;
  label: string;
  hint?: string;
  keywords?: string;
}

interface Props {
  options: SearchableOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  /** Optional extra action rendered at the bottom of the list */
  footer?: React.ReactNode;
}

export const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  searchPlaceholder = "Ketik untuk mencari...",
  emptyText = "Tidak ada hasil",
  disabled,
  className,
  footer,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 300);
    return options
      .filter((o) => `${o.label} ${o.hint || ""} ${o.keywords || ""}`.toLowerCase().includes(q))
      .slice(0, 300);
  }, [options, query]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[min(92vw,420px)] z-[60] bg-popover"
        align="start"
        collisionPadding={12}
      >
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              className="pl-8 h-9"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="max-h-[45vh] overflow-y-auto">
          <div className="p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent",
                    value === o.value && "bg-accent",
                  )}
                >
                  <Check className={cn("h-4 w-4 shrink-0", value === o.value ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.hint && <span className="block truncate text-xs text-muted-foreground">{o.hint}</span>}
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        {footer && <div className="border-t p-2">{footer}</div>}
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;
