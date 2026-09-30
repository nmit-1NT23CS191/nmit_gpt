import dynamic from "next/dynamic";

const MapWidgetClient = dynamic(() => import("./MapWidgetClient"), {
  ssr: false,
});

export default function MapWidget(props) {
  return <MapWidgetClient {...props} />;
}
