"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// NMIT campus, Yelahanka, Bengaluru — fallback center when a venue has no
// stored coordinates yet.
const DEFAULT_CENTER = [13.1067, 77.5975];

export default function MapWidgetClient({ venue, latitude, longitude }) {
  const position = latitude && longitude ? [latitude, longitude] : DEFAULT_CENTER;

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 h-64 w-full">
      <MapContainer center={position} zoom={17} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>{venue}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
