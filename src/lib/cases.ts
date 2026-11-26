// Arama motorları için donanıma özel açılış sayfaları; her sayfa bir galeri modelini anlatır.
import { GALLERY_IMAGES, GALLERY_MODELS, type GalleryModel } from "./gallery";

type T = { tr: string; en: string };
export interface CasePage {
  slug: string;
  modelId: string;
  title: string;
  description: string;
  h1: T;
  intro: T;
  features: T[];
  keywords: string[];
}

export const CASE_PAGES: CasePage[] = [
  {
    slug: "raspberry-pi-4-din-rail-case-stl", modelId: "gallery-rpi4-din",
    title: "Raspberry Pi 4 DIN Rail Case STL — Free & Customizable | EncloCAD",
    description: "Free Raspberry Pi 4 DIN rail case STL with exact USB-C, micro-HDMI, RJ45 and USB openings, hinged lid and 35 mm rail clip. Customize and download.",
    h1: { en: "Raspberry Pi 4 DIN Rail Case (STL)", tr: "Raspberry Pi 4 DIN Rayı Kutusu (STL)" },
    intro: {
      en: "A 3D printable Raspberry Pi 4 enclosure with every port opening placed from the board's real dimensions, a hinged snap lid and a separate clip for 35 mm DIN rails.",
      tr: "Kartın gerçek ölçülerine göre tüm port kesimleri hazır, menteşeli çıtçıt kapaklı ve 35 mm DIN rayı için ayrı klipsli 3B baskıya uygun Raspberry Pi 4 kutusu.",
    },
    features: [
      { en: "USB-C, 2× micro-HDMI, audio, RJ45 and 2× dual USB-A openings", tr: "USB-C, 2× micro-HDMI, ses, RJ45 ve 2× çift USB-A kesimleri" },
      { en: "Standoffs on the official 58 × 49 mm mounting holes", tr: "Resmi 58 × 49 mm montaj deliklerinde ayaklar" },
      { en: "Separate 35 mm DIN rail clip, honeycomb lid ventilation", tr: "Ayrı 35 mm DIN rayı klipsi, petek kapak havalandırması" },
    ],
    keywords: ["Raspberry Pi 4 DIN rail case", "Raspberry Pi 4 enclosure STL", "RPi 4 case 3D print"],
  },
  {
    slug: "esp32-enclosure-snap-fit-stl", modelId: "gallery-esp32-iot",
    title: "ESP32 Enclosure STL — Snap-Fit Hinged IoT Box | EncloCAD",
    description: "Free ESP32 DevKit enclosure STL with micro-USB opening, hinged snap-fit lid and ventilation. Change the size online and download print-ready STL.",
    h1: { en: "ESP32 Snap-Fit Enclosure (STL)", tr: "ESP32 Çıtçıtlı Kutu (STL)" },
    intro: {
      en: "A compact, support-free ESP32 DevKit project box with a hinged snap lid printed in the same job as the base.",
      tr: "Kapağı gövdeyle aynı baskıda çıkan, desteksiz, menteşeli çıtçıt kapaklı kompakt ESP32 DevKit proje kutusu.",
    },
    features: [
      { en: "Micro-USB opening aligned to the DevKit", tr: "DevKit'e hizalı micro-USB kesimi" },
      { en: "Hinged snap-fit lid, no screws needed", tr: "Menteşeli çıtçıt kapak, vida gerekmez" },
      { en: "Front vent and honeycomb lid for sensors", tr: "Sensörler için ön havalandırma ve petek kapak" },
    ],
    keywords: ["ESP32 enclosure STL", "ESP32 case snap fit", "ESP32 IoT box 3D print"],
  },
  {
    slug: "arduino-uno-case-stl", modelId: "gallery-arduino-uno",
    title: "Arduino Uno Case STL — Free R3 Enclosure | EncloCAD",
    description: "Free Arduino Uno R3 case STL with USB-B and DC jack openings, asymmetric standoffs and heat-set insert screw lid. Customize and download.",
    h1: { en: "Arduino Uno R3 Case (STL)", tr: "Arduino Uno R3 Kutusu (STL)" },
    intro: {
      en: "An Arduino Uno R3 enclosure whose standoffs follow the board's asymmetric hole pattern, with USB-B and power jack openings already in place.",
      tr: "Ayakları kartın asimetrik delik düzenine göre yerleşmiş, USB-B ve güç girişi kesimleri hazır Arduino Uno R3 kutusu.",
    },
    features: [
      { en: "USB-B and DC barrel jack openings", tr: "USB-B ve DC güç girişi kesimleri" },
      { en: "Standoffs on all four original Uno holes", tr: "Uno'nun dört orijinal deliğinde ayaklar" },
      { en: "Screw lid with heat-set insert bosses", tr: "Pirinç insert yuvalı vidalı kapak" },
    ],
    keywords: ["Arduino Uno case STL", "Arduino Uno R3 enclosure", "Arduino box 3D print"],
  },
  {
    slug: "pipe-travel-case-tobacco-box-stl", modelId: "gallery-pipe-case",
    title: "Pipe Travel Case STL with Tobacco Box — 3D Printable | EncloCAD",
    description: "3D printable EDC pipe travel case for 3 pipes, a tobacco compartment with separate inner lid, lighter and tamper. Hinged snap lid, free STL.",
    h1: { en: "Pipe Travel Case with Tobacco Box (STL)", tr: "Tütün Bölmeli Pipo Seyahat Kutusu (STL)" },
    intro: {
      en: "One 186 × 146 × 48 mm case for three pipes, a tamper, a lighter and tobacco — the tobacco bay has its own lid so nothing spills.",
      tr: "Üç pipo, maşa, çakmak ve tütün için tek bir 186 × 146 × 48 mm kutu — tütün haznesinin kendi kapağı var, dökülmez.",
    },
    features: [
      { en: "Bays for 3 pipes, lighter and tamper", tr: "3 pipo, çakmak ve maşa için bölmeler" },
      { en: "Tobacco compartment with separate handled inner lid", tr: "Ayrı, tutamaçlı iç kapaklı tütün haznesi" },
      { en: "Hinged snap lid printed with the base", tr: "Gövdeyle birlikte basılan menteşeli çıtçıt kapak" },
    ],
    keywords: ["pipe travel case STL", "tobacco box 3D print", "EDC pipe case"],
  },
];

export function findCase(slug: string): { page: CasePage; model: GalleryModel; image: string } | undefined {
  const page = CASE_PAGES.find((c) => c.slug === slug);
  const model = page && GALLERY_MODELS.find((m) => m.id === page.modelId);
  if (!page || !model) return undefined;
  return { page, model, image: `https://enclocad.com${GALLERY_IMAGES[model.id]}` };
}

export const caseSlugFor = (modelId: string) => CASE_PAGES.find((c) => c.modelId === modelId)?.slug;
