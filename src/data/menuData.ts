
import iphone from "@/assets/iphone_15_pro_clean_1777552818080.png";
import macbook from "@/assets/macbook_air_m3_dark_1777552961961.png";
import sonyTv from "@/assets/sony_tv_bundle_1777553396955.png";
import s24Ultra from "@/assets/s24_ultra_tech_1777554373914.png";
import sonyXm5 from "@/assets/sony_xm5_headphones_1777554412571.png";
import ipadPro from "@/assets/ipad_pro_m4_ultra_thin_1777554430891.png";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  specs?: string;
  tags?: string[];
  category: string;
  rating?: number;
  reviews?: number;
  isTop?: boolean;
  aiMatch?: number;
}

export const menuItems: MenuItem[] = [
  { 
    id: "1", 
    name: "iPhone 15 Pro", 
    description: "Titanium design, A17 Pro chip, customizable Action button, and a more versatile Pro camera system.", 
    price: 999.00, 
    image: iphone, 
    tags: ["New", "Apple"], 
    category: "Phones", 
    rating: 4.9, 
    reviews: 1250, 
    isTop: true 
  },
  { 
    id: "2", 
    name: "MacBook Air M3", 
    description: "Supercharged by the M3 chip. With a thin, light design and up to 18 hours of battery life.", 
    price: 1099.00, 
    image: macbook, 
    tags: ["Best Seller", "M3"], 
    category: "Laptops", 
    rating: 4.8, 
    reviews: 850,
    isTop: true
  },
  { 
    id: "3", 
    name: "Sony 4K Smart TV Bundle", 
    description: "Experience cinematic quality with this 65-inch 4K HDR LED TV and premium soundbar.", 
    price: 1299.95, 
    image: sonyTv, 
    category: "Audio",
    rating: 4.7,
    reviews: 420
  },
  { 
    id: "4", 
    name: "Samsung S24 Ultra", 
    description: "The ultimate Galaxy Ultra experience with Galaxy AI, a 200MP camera, and built-in S Pen.", 
    price: 1199.00, 
    image: s24Ultra, 
    category: "Phones", 
    aiMatch: 98,
    tags: ["Galaxy AI"]
  },
  { 
    id: "5", 
    name: "Sony WH-1000XM5", 
    description: "Industry-leading noise cancellation and premium sound quality for an immersive listening experience.", 
    price: 348.00, 
    image: sonyXm5, 
    tags: ["Audio", "Wireless"], 
    category: "Audio",
    rating: 4.9,
    reviews: 2100,
    isTop: true
  },
  { 
    id: "6", 
    name: "iPad Pro M4", 
    description: "Thin, light, and powerful. The new iPad Pro features the world's most advanced display.", 
    price: 899.00, 
    image: ipadPro, 
    category: "Tablets", 
    isTop: true,
    tags: ["OLED"]
  }
];

export const categories = ["All", "Electronics", "Fashion & Apparel", "Home & Kitchen", "Beauty & Care", "Sports & Outdoors", "Toys & Hobbies", "Accessories"];
