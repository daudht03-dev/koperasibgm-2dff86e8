/// <reference types="google.maps" />
// Shared Google Maps JS API loader (loads script once)
let loaderPromise: Promise<typeof globalThis.google> | null = null;

export function loadGoogleMaps(): Promise<typeof globalThis.google> {
  if (typeof window !== "undefined" && (window as any).google?.maps) {
    return Promise.resolve((window as any).google);
  }
  if (loaderPromise) return loaderPromise;

  const apiKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;

  if (!apiKey) {
    return Promise.reject(
      new Error(
        "Google Maps browser key belum dikonfigurasi. Sambungkan konektor Google Maps Platform terlebih dahulu."
      )
    );
  }

  loaderPromise = new Promise((resolve, reject) => {
    const cbName = `__gmapsCb_${Math.random().toString(36).slice(2)}`;
    (window as any)[cbName] = () => {
      resolve((window as any).google);
      delete (window as any)[cbName];
    };

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      loading: "async",
      callback: cbName,
      libraries: "marker,places,visualization",
    });
    if (channel) params.set("channel", channel);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("Gagal memuat Google Maps JS API"));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}
