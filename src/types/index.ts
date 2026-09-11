export interface AmavasyaTithi {
  id: string;
  name: string;
  bengaliMonth: string;
  englishDate: string;
  starts: string;
  ends: string;
  isSpecial: boolean;
  significance: string;
}

export interface PoojaTiming {
  name: string;
  time: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: "বিগ্রহ" | "উৎসব" | "আরতি" | "প্রাঙ্গণ";
  imageUrl: string;
  caption: string;
}

export interface PresetAmount {
  bn: string;
  val: number;
}

