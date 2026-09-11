import HeroBanner from "@/components/sections/HeroBanner";
import MandirLegend from "@/components/sections/MandirLegend";
import PanjikaCalendar from "@/components/sections/PanjikaCalendar";
import DarshanTimings from "@/components/sections/DarshanTimings";
import TempleGallery from "@/components/sections/TempleGallery";
import SevaPayment from "@/components/sections/SevaPayment";
import WhatsAppCommunity from "@/components/sections/WhatsAppCommunity";
import LocationMap from "@/components/sections/LocationMap";

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <MandirLegend />
      <PanjikaCalendar />
      <DarshanTimings />
      <TempleGallery />
      <SevaPayment />
      <WhatsAppCommunity />
      <LocationMap />
    </>
  );
}
