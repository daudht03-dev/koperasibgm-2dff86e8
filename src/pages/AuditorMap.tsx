/// <reference types="google.maps" />
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LogOut, MapPin, Navigation, Search, ShieldCheck, X, Home, Leaf, Factory, Route as RouteIcon, Layers, FileDown, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RouteHistoryEntry {
  id: string;
  origin_label: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  dest_label: string | null;
  dest_code: string | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  created_at: string;
}


interface Farmer {
  id: string;
  kode_petani: string;
  nama: string;
  alamat_rumah: string | null;
  koordinat_lat: number | null;
  koordinat_lng: number | null;
  is_organic: boolean | null;
}
interface Land {
  id: string;
  petani_id: string;
  nama_lahan: string;
  lokasi: string | null;
  koordinat: string | null;
  luas: number | null;
  is_organic: boolean | null;
}
interface Prefix {
  code: string;
  name: string;
}

type MarkerKind = "home" | "land";
interface Point {
  kind: MarkerKind;
  id: string;
  lat: number;
  lng: number;
  label: string;
  farmer: Farmer;
  land?: Land;
}

const parseCoordinate = (koordinat: string): { lat: number; lng: number } | null => {
  if (!koordinat) return null;
  const m = koordinat.replace(/\s+/g, " ").trim().match(/^(-?\d+\.?\d*)\s*[, ]\s*(-?\d+\.?\d*)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
  return null;
};

const naturalSort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const AuditorMap = () => {
  const { signOut, user } = useAuth();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const markerByIdRef = useRef<Record<string, google.maps.Marker>>({});
  const focusMarkerRef = useRef<google.maps.Marker | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const userAccuracyRef = useRef<google.maps.Circle | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [lands, setLands] = useState<Land[]>([]);
  const [prefixes, setPrefixes] = useState<Prefix[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [search, setSearch] = useState("");
  const [villageFilter, setVillageFilter] = useState<string>("all");
  const [organicFilter, setOrganicFilter] = useState<string>("all");
  const [mapType, setMapType] = useState<string>("hybrid");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [route, setRoute] = useState<{ distanceMeters: number; duration: string; polyline: string } | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeHistory, setRouteHistory] = useState<RouteHistoryEntry[]>([]);
  const [exporting, setExporting] = useState(false);


  const prefixMap = useMemo<Record<string, string>>(
    () => Object.fromEntries(prefixes.map((p) => [p.code, p.name])),
    [prefixes],
  );

  const extractVillage = (code: string) => (code.match(/^([A-Za-z]+)/)?.[1] || "").toUpperCase();

  const points = useMemo<Point[]>(() => {
    const list: Point[] = [];
    for (const f of farmers) {
      if (f.koordinat_lat != null && f.koordinat_lng != null) {
        list.push({
          kind: "home",
          id: `home-${f.id}`,
          lat: f.koordinat_lat,
          lng: f.koordinat_lng,
          label: f.kode_petani,
          farmer: f,
        });
      }
    }
    for (const l of lands) {
      const coord = parseCoordinate(l.koordinat || "");
      if (!coord) continue;
      const f = farmers.find((x) => x.id === l.petani_id);
      if (!f) continue;
      list.push({
        kind: "land",
        id: `land-${l.id}`,
        lat: coord.lat,
        lng: coord.lng,
        label: l.nama_lahan,
        farmer: f,
        land: l,
      });
    }
    return list;
  }, [farmers, lands]);

  const villages = useMemo(() => {
    const s = new Set<string>();
    points.forEach((p) => {
      const v = extractVillage(p.kind === "home" ? p.farmer.kode_petani : p.label);
      if (v) s.add(v);
    });
    return Array.from(s).sort();
  }, [points]);

  const filteredPoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    return points.filter((p) => {
      const v = extractVillage(p.kind === "home" ? p.farmer.kode_petani : p.label);
      if (villageFilter !== "all" && v !== villageFilter) return false;
      const organic = p.land?.is_organic ?? p.farmer.is_organic;
      if (organicFilter === "organic" && !organic) return false;
      if (organicFilter === "conventional" && organic) return false;
      if (!q) return true;
      return (
        p.label.toLowerCase().includes(q) ||
        p.farmer.kode_petani.toLowerCase().includes(q) ||
        p.farmer.nama.toLowerCase().includes(q) ||
        (p.farmer.alamat_rumah || "").toLowerCase().includes(q) ||
        (p.land?.lokasi || "").toLowerCase().includes(q)
      );
    });
  }, [points, search, villageFilter, organicFilter]);

  // Fetch data via edge function (RLS-safe for auditors)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("public-audit-map", { body: {} });
      if (error) {
        toast({ title: "Gagal memuat data", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      const d = data as any;
      setFarmers(d.farmers ?? []);
      setLands(d.lands ?? []);
      setPrefixes(d.prefixes ?? []);
      setLoading(false);
    };
    load();
  }, []);

  // Init map
  useEffect(() => {
    if (loading || !mapContainer.current || mapRef.current) return;
    (async () => {
      try {
        const google = await loadGoogleMaps();
        mapRef.current = new google.maps.Map(mapContainer.current!, {
          center: { lat: -7.5, lng: 109.3 },
          zoom: 10,
          mapTypeId: mapType,
          scaleControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });
        infoRef.current = new google.maps.InfoWindow();
        google.maps.event.addListenerOnce(mapRef.current, "idle", () => setMapReady(true));
      } catch (err: any) {
        toast({ title: "Gagal memuat peta", description: err.message, variant: "destructive" });
      }
    })();
  }, [loading, mapType]);

  // Build markers on point change
  useEffect(() => {
    if (!mapRef.current || !mapReady || !(window as any).google?.maps) return;
    const google = (window as any).google;
    clustererRef.current?.clearMarkers();
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    markerByIdRef.current = {};

    const bounds = new google.maps.LatLngBounds();
    filteredPoints.forEach((p) => {
      const isOrganic = p.land?.is_organic ?? p.farmer.is_organic;
      const color = p.kind === "home" ? "#7c3aed" : isOrganic ? "#16a34a" : "#ea580c";
      const marker = new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        title: `${p.label} – ${p.farmer.nama}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: p.kind === "home" ? 11 : 9,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        setSelectedPoint(p);
        setRoute(null);
        routePolylineRef.current?.setMap(null);
      });
      markersRef.current.push(marker);
      markerByIdRef.current[p.id] = marker;
      bounds.extend(marker.getPosition()!);
    });

    if (filteredPoints.length > 20) {
      clustererRef.current = new MarkerClusterer({ map: mapRef.current!, markers: markersRef.current });
    } else {
      markersRef.current.forEach((m) => m.setMap(mapRef.current!));
    }

    if (filteredPoints.length > 0) {
      mapRef.current.fitBounds(bounds, 60);
      google.maps.event.addListenerOnce(mapRef.current, "idle", () => {
        if (mapRef.current && (mapRef.current.getZoom() ?? 0) > 16) mapRef.current.setZoom(16);
      });
    }
  }, [filteredPoints, mapReady]);

  /** Pan/zoom precisely to a point, highlight it and select it. */
  const focusPoint = useCallback((p: Point) => {
    setSelectedPoint(p);
    setRoute(null);
    routePolylineRef.current?.setMap(null);
    if (!mapRef.current || !(window as any).google?.maps) return;
    const google = (window as any).google;
    mapRef.current.panTo({ lat: p.lat, lng: p.lng });
    mapRef.current.setZoom(18);
    focusMarkerRef.current?.setMap(null);
    focusMarkerRef.current = new google.maps.Marker({
      position: { lat: p.lat, lng: p.lng },
      map: mapRef.current,
      zIndex: 9999,
      animation: google.maps.Animation.BOUNCE,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 16,
        fillColor: "#2563eb",
        fillOpacity: 0.28,
        strokeColor: "#2563eb",
        strokeWeight: 3,
      },
      title: p.label,
    });
    mapContainer.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);


  useEffect(() => {
    if (mapRef.current) mapRef.current.setMapTypeId(mapType);
  }, [mapType]);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "Geolokasi tidak didukung", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const google = (window as any).google;
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setUserLocation(loc);
        if (!mapRef.current) return;
        userMarkerRef.current?.setMap(null);
        userAccuracyRef.current?.setMap(null);
        userMarkerRef.current = new google.maps.Marker({
          position: loc,
          map: mapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#2563eb",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 3,
          },
          title: "Lokasi Anda",
          zIndex: 999,
        });
        userAccuracyRef.current = new google.maps.Circle({
          strokeColor: "#2563eb",
          strokeOpacity: 0.4,
          strokeWeight: 1,
          fillColor: "#2563eb",
          fillOpacity: 0.15,
          map: mapRef.current,
          center: loc,
          radius: loc.accuracy,
        });
        mapRef.current.panTo(loc);
        mapRef.current.setZoom(15);
      },
      (err) => toast({ title: "Gagal mendapatkan lokasi", description: err.message, variant: "destructive" }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const decodePolyline = (encoded: string): { lat: number; lng: number }[] => {
    const points: { lat: number; lng: number }[] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      shift = 0; result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return points;
  };

  const fetchRouteHistory = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("auditor_route_history")
      .select("id,origin_label,origin_lat,origin_lng,dest_label,dest_code,distance_meters,duration_seconds,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("Gagal memuat riwayat rute", error);
      return;
    }
    setRouteHistory((data || []) as RouteHistoryEntry[]);
  }, [user]);

  useEffect(() => {
    fetchRouteHistory();
  }, [fetchRouteHistory]);

  const routeToSelected = async () => {

    if (!selectedPoint || !userLocation) return;
    setRouting(true);
    routePolylineRef.current?.setMap(null);
    const { data, error } = await supabase.functions.invoke("directions-route", {
      body: {
        origin: { lat: userLocation.lat, lng: userLocation.lng },
        destination: { lat: selectedPoint.lat, lng: selectedPoint.lng },
        travelMode: "DRIVE",
      },
    });
    setRouting(false);
    if (error || !data) {
      toast({ title: "Gagal mendapatkan rute", description: error?.message, variant: "destructive" });
      return;
    }
    const d = data as any;
    setRoute({ distanceMeters: d.distanceMeters, duration: d.duration, polyline: d.polyline });
    const google = (window as any).google;
    if (mapRef.current && d.polyline) {
      const path = decodePolyline(d.polyline);
      routePolylineRef.current = new google.maps.Polyline({
        map: mapRef.current,
        path,
        strokeColor: "#2563eb",
        strokeWeight: 5,
        strokeOpacity: 0.85,
      });
      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      mapRef.current.fitBounds(bounds, 80);
    }

    // Simpan jejak audit rute
    const durationSeconds = parseInt(String(d.duration ?? "").replace("s", ""), 10);
    const { error: histErr } = await supabase.from("auditor_route_history").insert({
      user_id: user?.id as string,
      email: user?.email ?? null,
      origin_label: "Lokasi Saya",
      origin_lat: userLocation.lat,
      origin_lng: userLocation.lng,
      dest_label: `${selectedPoint.label} — ${selectedPoint.farmer.nama}`,
      dest_code: selectedPoint.kind === "home" ? selectedPoint.farmer.kode_petani : selectedPoint.label,
      dest_lat: selectedPoint.lat,
      dest_lng: selectedPoint.lng,
      travel_mode: "DRIVE",
      distance_meters: d.distanceMeters ?? null,
      duration_seconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
    });
    if (histErr) console.error("Gagal menyimpan riwayat rute", histErr);
    else fetchRouteHistory();
  };

  const closeSelection = () => {
    setSelectedPoint(null);
    setRoute(null);
    routePolylineRef.current?.setMap(null);
  };

  const formatDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
  const formatSeconds = (s: number | null) => {
    if (s == null || !Number.isFinite(s)) return "-";
    const min = Math.round(s / 60);
    if (min < 60) return `${min} menit`;
    return `${Math.floor(min / 60)} jam ${min % 60} menit`;
  };
  const formatDuration = (dur: string) => {
    // "1234s"
    const s = parseInt(dur.replace("s", ""), 10);
    return formatSeconds(Number.isFinite(s) ? s : null) === "-" ? dur : formatSeconds(s);
  };

  const handleExportPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const now = new Date();
      doc.setFontSize(14);
      doc.text("Laporan Audit — Peta Petani & Lahan", 14, 15);
      doc.setFontSize(9);
      doc.text(`Auditor: ${user?.email ?? "-"}`, 14, 21);
      doc.text(`Dicetak: ${now.toLocaleString("id-ID")}`, 14, 26);
      const filterInfo = [
        `Desa: ${villageFilter === "all" ? "Semua" : `${prefixMap[villageFilter] || villageFilter} (${villageFilter})`}`,
        `Status: ${organicFilter === "all" ? "Semua" : organicFilter === "organic" ? "Organik" : "Konvensional"}`,
        `Pencarian: ${search.trim() || "-"}`,
      ].join("   |   ");
      doc.text(filterInfo, 14, 31);

      const rows = [...filteredPoints]
        .sort((a, b) => naturalSort(a.label, b.label))
        .map((p, i) => [
          String(i + 1),
          p.kind === "home" ? "Rumah" : "Lahan",
          p.label,
          p.farmer.kode_petani,
          p.farmer.nama,
          (p.land?.is_organic ?? p.farmer.is_organic) ? "Organik" : "Konvensional",
          p.lat.toFixed(6),
          p.lng.toFixed(6),
          p.kind === "home" ? p.farmer.alamat_rumah || "-" : p.land?.lokasi || "-",
        ]);

      autoTable(doc, {
        startY: 36,
        head: [["No", "Tipe", "Kode", "Kode Petani", "Nama Petani", "Status", "Latitude", "Longitude", "Alamat/Lokasi"]],
        body: rows,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [37, 99, 235] },
        columnStyles: { 8: { cellWidth: 70 } },
      });

      let y = (doc as any).lastAutoTable?.finalY ?? 40;

      if (selectedPoint && route) {
        y += 8;
        doc.setFontSize(11);
        doc.text("Ringkasan Rute", 14, y);
        autoTable(doc, {
          startY: y + 2,
          head: [["Asal", "Tujuan", "Koordinat Tujuan", "Jarak", "Estimasi Waktu"]],
          body: [
            [
              userLocation ? `Lokasi Saya (${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)})` : "-",
              `${selectedPoint.label} — ${selectedPoint.farmer.nama}`,
              `${selectedPoint.lat.toFixed(6)}, ${selectedPoint.lng.toFixed(6)}`,
              formatDistance(route.distanceMeters),
              formatDuration(route.duration),
            ],
          ],
          styles: { fontSize: 8, cellPadding: 1.5 },
          headStyles: { fillColor: [22, 163, 74] },
        });
        y = (doc as any).lastAutoTable?.finalY ?? y;
      }

      if (routeHistory.length > 0) {
        y += 8;
        doc.setFontSize(11);
        doc.text("Riwayat Rute Auditor", 14, y);
        autoTable(doc, {
          startY: y + 2,
          head: [["Waktu", "Asal", "Tujuan", "Kode", "Jarak", "Waktu Tempuh"]],
          body: routeHistory
            .slice(0, 30)
            .map((h) => [
              new Date(h.created_at).toLocaleString("id-ID"),
              h.origin_lat != null ? `${h.origin_label ?? "Asal"} (${Number(h.origin_lat).toFixed(5)}, ${Number(h.origin_lng).toFixed(5)})` : h.origin_label ?? "-",
              h.dest_label ?? "-",
              h.dest_code ?? "-",
              h.distance_meters != null ? formatDistance(Number(h.distance_meters)) : "-",
              formatSeconds(h.duration_seconds != null ? Number(h.duration_seconds) : null),
            ]),
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [124, 58, 237] },
        });
      }

      doc.save(`audit-peta-${now.toISOString().slice(0, 10)}.pdf`);
    } catch (e: any) {
      toast({ title: "Gagal membuat PDF", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 h-9 w-9 rounded-full flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Peta Audit Petani & Lahan</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Keluar
          </Button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card className="shadow-gentle overflow-hidden">
          <CardContent className="p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari kode petani / kode lahan / alamat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={villageFilter} onValueChange={setVillageFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Desa</SelectItem>
                  {villages.map((v) => (
                    <SelectItem key={v} value={v}>{prefixMap[v] || v} ({v})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={organicFilter} onValueChange={setOrganicFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="organic">🌿 Organik</SelectItem>
                  <SelectItem value="conventional">🏭 Konvensional</SelectItem>
                </SelectContent>
              </Select>
              <Select value={mapType} onValueChange={setMapType}>
                <SelectTrigger className="w-[130px]"><Layers className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="roadmap">Jalan</SelectItem>
                  <SelectItem value="satellite">Satelit</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="terrain">Terrain</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={locateMe} className="gap-1">
                <Navigation className="h-4 w-4" /> Lokasi Saya
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportPDF} disabled={exporting} className="gap-1">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Unduh PDF
              </Button>

            </div>

            <div className="relative">
              <div ref={mapContainer} className="w-full h-[600px] rounded-md bg-muted" />
              {(loading || !mapReady) && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground border-t pt-3">
              <span className="font-semibold text-foreground">Legenda:</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-purple-600 ring-1 ring-white" /> Rumah Petani</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-green-600 ring-1 ring-white" /> Lahan Organik</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-orange-500 ring-1 ring-white" /> Lahan Konvensional</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-blue-600 ring-1 ring-white" /> Lokasi Anda</span>
              <span className="ml-auto">{filteredPoints.length} titik ditampilkan</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectedPoint ? (
            <Card className="shadow-gentle">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {selectedPoint.kind === "home" ? <Home className="h-4 w-4 text-purple-600" /> : <MapPin className="h-4 w-4" />}
                      {selectedPoint.label}
                    </CardTitle>
                    <CardDescription>{selectedPoint.farmer.nama}</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={closeSelection}><X className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedPoint.farmer.kode_petani}</Badge>
                  {(selectedPoint.land?.is_organic ?? selectedPoint.farmer.is_organic) ? (
                    <Badge className="bg-green-600 hover:bg-green-600"><Leaf className="h-3 w-3 mr-1" /> Organik</Badge>
                  ) : (
                    <Badge className="bg-orange-500 hover:bg-orange-500"><Factory className="h-3 w-3 mr-1" /> Konvensional</Badge>
                  )}
                </div>
                {selectedPoint.kind === "home" && selectedPoint.farmer.alamat_rumah && (
                  <p><span className="text-muted-foreground">Alamat rumah:</span><br />{selectedPoint.farmer.alamat_rumah}</p>
                )}
                {selectedPoint.land?.lokasi && (
                  <p><span className="text-muted-foreground">Lokasi lahan:</span><br />{selectedPoint.land.lokasi}</p>
                )}
                {selectedPoint.land?.luas != null && (
                  <p><span className="text-muted-foreground">Luas:</span> {selectedPoint.land.luas} ha</p>
                )}
                <p className="font-mono text-xs">
                  {selectedPoint.lat.toFixed(6)}, {selectedPoint.lng.toFixed(6)}
                </p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPoint.lat},${selectedPoint.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline block"
                >
                  Buka di Google Maps →
                </a>
                <Button onClick={routeToSelected} disabled={routing || !userLocation} className="w-full gap-2">
                  {routing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RouteIcon className="h-4 w-4" />}
                  {userLocation ? "Rute dari Lokasi Saya" : "Aktifkan Lokasi dulu"}
                </Button>
                {route && (
                  <div className="rounded-md border p-3 bg-muted/40 text-sm space-y-1">
                    <p><strong>Jarak:</strong> {formatDistance(route.distanceMeters)}</p>
                    <p><strong>Estimasi waktu:</strong> {formatDuration(route.duration)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-gentle">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Panduan</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Klik titik di peta untuk melihat detail petani/lahan dan menghitung rute dari lokasi Anda.</p>
                <p>Gunakan pencarian untuk memfilter berdasarkan kode petani, kode lahan, nama, atau alamat.</p>
                <p className="text-xs pt-2 border-t">Nomor kontak petani tidak ditampilkan sesuai kebijakan privasi.</p>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-gentle">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Daftar Titik</CardTitle>
              <CardDescription>{filteredPoints.length} hasil</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[380px] overflow-y-auto divide-y">
                {[...filteredPoints]
                  .sort((a, b) => naturalSort(a.label, b.label))
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => focusPoint(p)}
                      className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 text-sm"
                    >
                      {p.kind === "home" ? <Home className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" /> : <MapPin className="h-3.5 w-3.5 flex-shrink-0" />}
                      <span className="font-mono text-xs">{p.label}</span>
                      <span className="text-muted-foreground truncate">{p.farmer.nama}</span>
                    </button>
                  ))}
                {filteredPoints.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">Tidak ada hasil</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-gentle">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" /> Riwayat Rute
              </CardTitle>
              <CardDescription>{routeHistory.length} pencarian rute tersimpan</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[280px] overflow-y-auto divide-y">
                {routeHistory.map((h) => (
                  <div key={h.id} className="px-3 py-2 text-xs space-y-0.5">
                    <p className="font-medium truncate">{h.dest_label ?? h.dest_code ?? "-"}</p>
                    <p className="text-muted-foreground">
                      {h.distance_meters != null ? formatDistance(Number(h.distance_meters)) : "-"} ·{" "}
                      {formatSeconds(h.duration_seconds != null ? Number(h.duration_seconds) : null)}
                    </p>
                    <p className="text-muted-foreground">{new Date(h.created_at).toLocaleString("id-ID")}</p>
                  </div>
                ))}
                {routeHistory.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">Belum ada rute dicari</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default AuditorMap;
