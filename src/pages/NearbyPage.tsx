import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Clock, Star, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/layout/AppHeader";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import "leaflet/dist/leaflet.css";

const locations = [
  { name: "TRENDS Tse Addo", badge: "⚡FASTEST", address: "Tse Addo, Accra, Ghana", dist: "0.8 mi", rating: 4.8, time: "15-20 min", status: "Open", lat: 5.6020, lng: -0.1118 },
  { name: "TRENDS Adjiringanor", address: "Adjiringanor, Accra, Ghana", dist: "2.4 mi", rating: 4.5, time: "25-35 min", status: "Open", lat: 5.6512, lng: -0.1485 },
  { name: "TRENDS UG Legon", address: "Bani Hostel, UG, Legon", dist: "3.1 mi", rating: 4.2, time: "30-45 min", status: "Closing Soon", lat: 5.6540, lng: -0.1865 },
  { name: "TRENDS Awoshie", address: "Awoshie, Accra, Ghana", dist: "4.5 mi", rating: 4.3, time: "35-50 min", status: "Open", lat: 5.5925, lng: -0.2740 },
  { name: "TRENDS Dansoman", address: "Dansoman, Accra, Ghana", dist: "5.2 mi", rating: 4.6, time: "40-55 min", status: "Open", lat: 5.5545, lng: -0.2520 },
];

const NearbyPage = () => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [pickupLocation, setPickupLocation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Artificial delay to show kinetic skeletons
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading || !mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [5.6042, -0.1670], 
        zoom: 12,
        zoomControl: false, 
        scrollWheelZoom: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 20, 
      }).addTo(map);

      L.control.zoom({
        position: 'bottomright'
      }).addTo(map);

      // Custom pulsing animation CSS
      const style = document.createElement('style');
      style.innerHTML = `
        .leaflet-marker-icon.pulsing-marker {
          background: #FFB800;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 0 rgba(255, 184, 0, 0.4);
          animation: pulse 2s infinite;
        }
        .user-location-marker {
          background: #3b82f6;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 0 rgba(59, 130, 246, 0.4);
          animation: user-pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 184, 0, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(255, 184, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 184, 0, 0); }
        }
        @keyframes user-pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background: rgba(10, 10, 10, 0.9);
          backdrop-filter: blur(12px);
          color: white;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .custom-popup .leaflet-popup-tip {
          background: rgba(10, 10, 10, 0.9);
        }
      `;
      document.head.appendChild(style);

      // User location marker logic
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const userIcon = L.divIcon({
              className: 'user-location-marker',
              html: `<div style="width:12px;height:12px;background:#3b82f6;border-radius:50%;border:2px solid white"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            });
            L.marker([latitude, longitude], { icon: userIcon })
              .addTo(map)
              .bindPopup("<b>You Are Here</b>", { className: 'custom-popup' });
            
            map.setView([latitude, longitude], 15);
          },
          (err) => console.log("Geolocation error:", err),
          { enableHighAccuracy: true }
        );
      }

      locations.forEach(loc => {
        const isFastest = loc.badge === "⚡FASTEST";
        const customIcon = L.divIcon({
          className: `custom-div-icon ${isFastest ? 'pulsing-marker' : ''}`,
          html: `<div style="width:12px;height:12px;background:${isFastest ? '#FFB800' : '#444'};border-radius:50%;border:2px solid white"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const popup = `
          <div style="font-family:'Outfit',sans-serif;min-width:160px;padding:4px">
            <strong style="display:block;margin-bottom:4px;font-size:14px">${loc.name}</strong>
            <span style="font-size:11px;color:#999">${loc.address}</span>
          </div>
        `;
        L.marker([loc.lat, loc.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(popup, { className: 'custom-popup' });
      });

      mapInstanceRef.current = map;
    });
  }, [isLoading]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleCenterOnMe = () => {
    if (navigator.geolocation && mapInstanceRef.current) {
      navigator.geolocation.getCurrentPosition((pos) => {
        mapInstanceRef.current.setView([pos.coords.latitude, pos.coords.longitude], 16, { animate: true });
      });
    }
  };

  if (isLoading) {
    return (
      <div className="pb-4 relative bg-black min-h-screen">
        <AppHeader title="Find TRENDS Hubs" />
        <div className="md:grid md:grid-cols-2 md:gap-4 md:px-4 md:mt-3">
          <div className="px-4 md:px-0">
            <Skeleton className="w-full h-[320px] rounded-[2rem]" />
          </div>
          <div className="px-4 md:px-0 mt-4 md:mt-0 space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-12 flex-1 rounded-xl" />
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>
            <Skeleton className="h-20 w-full rounded-xl" />
            <div className="pt-4 space-y-6">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                    <Skeleton className="h-10 w-12" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20 rounded-xl" />
                    <Skeleton className="h-8 w-20 rounded-xl" />
                    <Skeleton className="h-8 w-20 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4 relative">
      {/* Pickup Navigation Modal */}
      <Dialog open={!!pickupLocation} onOpenChange={() => setPickupLocation(null)}>
        <DialogContent className="sm:max-w-4xl w-full h-[100dvh] sm:h-[90vh] p-0 overflow-hidden bg-black border-none sm:border-white/10 sm:rounded-[2.5rem] z-[5000]">
          <DialogHeader className="sr-only">
            <DialogTitle>Pickup Navigation</DialogTitle>
          </DialogHeader>
          <PickupNavigation 
            location={pickupLocation} 
            onClose={() => setPickupLocation(null)} 
          />
        </DialogContent>
      </Dialog>

      <div className={`transition-all duration-500 ${pickupLocation ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
        <AppHeader title="Find TRENDS Hubs" />
        
        <div className="md:grid md:grid-cols-2 md:gap-4 md:px-4 md:mt-3">
          <div>
            <div
              ref={mapRef}
              className="mx-4 md:mx-0 mt-3 md:mt-0 rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 relative group transition-all duration-500 hover:border-primary/20"
              style={{ height: "320px" }}
            >
              <div className="absolute top-4 left-4 z-[1000] bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-[10px] text-white font-bold tracking-widest uppercase">Live Warehouse Status</span>
              </div>
            </div>
          </div>

          <div>
            <div className="mx-4 md:mx-0 mt-3 md:mt-0 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 border border-border rounded-xl px-3 py-2.5 bg-card">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <input placeholder="Enter address or zip code" className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              </div>
              <button 
                onClick={handleCenterOnMe}
                className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center active:scale-95 transition-transform"
              >
                <Navigation className="w-4 h-4" />
              </button>
            </div>

            <div className="mx-4 md:mx-0 mt-4 bg-secondary/10 border border-secondary/20 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Zap className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-foreground">AI Tip: Fastest Pickup</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    The <strong>Tse Addo</strong> hub has the lowest order volume right now. Save <strong>12 minutes</strong> by picking up here!
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 md:px-0 mt-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-foreground">Nearby Locations</h2>
                <button className="text-sm text-primary font-semibold">Filter By Distance →</button>
              </div>
              <div className="space-y-4">
                {locations.map(loc => (
                  <div key={loc.name} className="border-b border-border pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-foreground text-sm">{loc.name}</h3>
                          {loc.badge && <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">{loc.badge}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{loc.address}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-primary">{loc.dist}</span>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <Star className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs text-foreground">{loc.rating}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className={loc.status === "Closing Soon" ? "text-amber-500 font-medium" : "text-foreground"}>{loc.status}</span>
                      <span>|</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> Delivery: {loc.time}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => navigate("/menu")} className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-white/5 transition-colors">Store</button>
                      <button 
                        onClick={() => setPickupLocation(loc)} 
                        className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-white/5 transition-colors"
                      >
                        Pickup
                      </button>
                      <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95">Delivery</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PickupNavigation = ({ location, onClose }: { location: any; onClose: () => void }) => {
  if (!location) return null;

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const routeLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const [distance, setDistance] = useState<string>("Calculating...");
  const [eta, setEta] = useState<string>("-- min");

  useEffect(() => {
    if (!mapRef.current || !location) return;

    import("leaflet").then(L => {
      const map = L.map(mapRef.current!, {
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
      }).addTo(map);

      // Add Warehouse Marker
      const destIcon = L.divIcon({
        className: 'pulsing-marker',
        html: `<div style="width:18px;height:18px;background:#FFB800;border-radius:50%;border:3px solid white;box-shadow:0 0 20px rgba(255,184,0,0.6)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      L.marker([location.lat, location.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>${location.name}</b><br/>Ready for pickup!`, { className: 'custom-popup' })
        .openPopup();

      mapInstanceRef.current = map;

      // Start Live Tracking
      if (navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            
            // Update User Marker
            if (!userMarkerRef.current) {
              const userIcon = L.divIcon({
                className: 'user-location-marker',
                html: `<div style="width:16px;height:16px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 20px rgba(59,130,246,0.6)"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              });
              userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon }).addTo(map);
            } else {
              userMarkerRef.current.setLatLng([latitude, longitude]);
            }

            // Fetch Route from OSRM
            try {
              const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${location.lng},${location.lat}?overview=full&geometries=geojson`
              );
              const data = await response.json();
              
              if (data.routes && data.routes[0]) {
                const route = data.routes[0];
                const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
                
                if (routeLayerRef.current) {
                  map.removeLayer(routeLayerRef.current);
                }
                
                routeLayerRef.current = L.polyline(coords, {
                  color: '#FFB800',
                  weight: 6,
                  opacity: 0.9,
                  lineJoin: 'round',
                  dashArray: '1, 14',
                  dashOffset: '0'
                }).addTo(map);

                // Add a glow effect behind the route
                const glow = L.polyline(coords, {
                  color: '#FFB800',
                  weight: 12,
                  opacity: 0.25,
                  lineJoin: 'round'
                }).addTo(map);

                // Update Stats
                setDistance((route.distance / 1000 * 0.621371).toFixed(1) + " miles");
                setEta(Math.ceil(route.duration / 60) + " min");

                // Zoom to fit if first time
                if (!mapInstanceRef.current.hasFit) {
                  map.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });
                  mapInstanceRef.current.hasFit = true;
                }
              }
            } catch (err) {
              console.error("Routing error:", err);
            }
          },
          (err) => console.log("Track error:", err),
          { enableHighAccuracy: true }
        );
      }
    });

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (mapInstanceRef.current) mapInstanceRef.current.remove();
    };
  }, [location]);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div ref={mapRef} className="flex-1 w-full" />
      
      {/* Bottom Info Card */}
      <div className="absolute bottom-6 left-6 right-6 z-[2000] animate-in slide-in-from-bottom duration-700">
        <div className="bg-black/40 backdrop-blur-[40px] border border-white/10 rounded-[2rem] p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-white font-black text-2xl tracking-tight">{location.name}</h4>
              <p className="text-neutral-400 text-sm font-medium">{location.address}</p>
            </div>
            <div className="bg-primary/20 text-primary px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border border-primary/20">
              Live Nav
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-xl">
              <span className="text-primary text-[10px] uppercase font-black tracking-widest">Distance</span>
              <p className="text-white text-2xl font-black mt-1">{distance}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-xl">
              <span className="text-primary text-[10px] uppercase font-black tracking-widest">Est. Arrival</span>
              <p className="text-white text-2xl font-black mt-1">{eta}</p>
            </div>
          </div>

          <Button 
            className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground h-14 rounded-2xl font-black uppercase tracking-widest shadow-[0_5px_30px_-5px_rgba(255,184,0,0.4)]"
            onClick={onClose}
          >
            End Navigation
          </Button>
        </div>
      </div>

      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-[2000] w-12 h-12 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
    </div>
  );
};

export default NearbyPage;
