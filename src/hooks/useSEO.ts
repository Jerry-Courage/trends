import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
}

export function useSEO({ title, description, keywords, ogImage }: SEOProps) {
  useEffect(() => {
    // 1. Update document title
    const fullTitle = `${title} | Trends`;
    document.title = fullTitle;

    // Helper to get or create a meta tag
    const updateMetaTag = (attribute: string, value: string, content: string) => {
      let element = document.querySelector(`meta[${attribute}="${value}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, value);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // 2. Update description & keywords
    updateMetaTag("name", "description", description);
    if (keywords) {
      updateMetaTag("name", "keywords", keywords);
    } else {
      // Default fallback keywords
      updateMetaTag("name", "keywords", "trends store, trends ecommerce ghana, trends marketplace, online shopping accra, Ghana online market, trends ghana, online shopping store, global shipping shop, dropship store, worldwide delivery store, fashion, beauty, home products, local courier");
    }

    // 3. Update OpenGraph tags
    updateMetaTag("property", "og:title", fullTitle);
    updateMetaTag("property", "og:description", description);
    updateMetaTag("property", "og:type", "website");
    if (ogImage) {
      updateMetaTag("property", "og:image", ogImage);
    }

    // 4. Update Twitter Card tags
    updateMetaTag("name", "twitter:card", "summary_large_image");
    updateMetaTag("name", "twitter:title", fullTitle);
    updateMetaTag("name", "twitter:description", description);
    if (ogImage) {
      updateMetaTag("name", "twitter:image", ogImage);
    }
  }, [title, description, keywords, ogImage]);
}
