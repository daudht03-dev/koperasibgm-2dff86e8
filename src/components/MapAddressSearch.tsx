/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2, X } from "lucide-react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

interface Suggestion {
  placeId: string;
  primary: string;
  secondary: string;
  prediction: any;
}

interface MapAddressSearchProps {
  onSelect: (result: { lat: number; lng: number; address: string }) => void;
  placeholder?: string;
  className?: string;
}

export const MapAddressSearch = ({ onSelect, placeholder = "Cari alamat atau lokasi...", className }: MapAddressSearchProps) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const placesLibRef = useRef<any>(null);
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGoogleMaps().then(async (google) => {
      const places: any = await google.maps.importLibrary("places");
      placesLibRef.current = places;
      sessionTokenRef.current = new places.AutocompleteSessionToken();
    }).catch((e) => console.error("Places load error:", e));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSuggestions = async (value: string) => {
    if (!value.trim() || !placesLibRef.current) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const { AutocompleteSuggestion } = placesLibRef.current;
      const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: value,
        sessionToken: sessionTokenRef.current,
      });
      const mapped: Suggestion[] = (results || [])
        .filter((s: any) => s.placePrediction)
        .map((s: any) => ({
          placeId: s.placePrediction.placeId,
          primary: s.placePrediction.mainText?.text || s.placePrediction.text?.text || "",
          secondary: s.placePrediction.secondaryText?.text || "",
          prediction: s.placePrediction,
        }));
      setSuggestions(mapped);
      setOpen(mapped.length > 0);
    } catch (e) {
      console.error("Autocomplete error:", e);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (val: string) => {
    setInput(val);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchSuggestions(val), 300);
  };

  const handlePick = async (s: Suggestion) => {
    try {
      setLoading(true);
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });
      const loc = place.location;
      if (!loc) return;
      const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
      const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
      const address = place.formattedAddress || place.displayName || s.primary;
      onSelect({ lat, lng, address });
      setInput(address);
      setOpen(false);
      // refresh session token after selection (per Places API billing)
      if (placesLibRef.current) {
        sessionTokenRef.current = new placesLibRef.current.AutocompleteSessionToken();
      }
    } catch (e) {
      console.error("Place details error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInput("");
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="pl-8 pr-8 h-9"
        />
        {loading ? (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : input ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] rounded-md border bg-popover shadow-lg max-h-72 overflow-auto">
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              type="button"
              onClick={() => handlePick(s)}
              className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-b-0 text-sm"
            >
              <div className="font-medium truncate">{s.primary}</div>
              {s.secondary && (
                <div className="text-xs text-muted-foreground truncate">{s.secondary}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
