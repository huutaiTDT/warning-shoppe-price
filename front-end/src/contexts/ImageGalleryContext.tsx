/** @format */

import { createContext, ReactNode, useContext, useState } from "react";

interface ImageItem {
  src: string;
  alt?: string;
}

interface GalleryContextType {
  images: ImageItem[];
  currentIndex: number;
  isOpen: boolean;
  openGallery: (images: ImageItem[], startIndex?: number) => void;
  closeGallery: () => void;
  setCurrentIndex: (index: number) => void;
  nextImage: () => void;
  prevImage: () => void;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export function ImageGalleryProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const openGallery = (newImages: ImageItem[], startIndex = 0) => {
    setImages(newImages);
    setCurrentIndex(startIndex);
    setIsOpen(true);
  };

  const closeGallery = () => setIsOpen(false);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <GalleryContext.Provider
      value={{
        images,
        currentIndex,
        isOpen,
        openGallery,
        closeGallery,
        setCurrentIndex,
        nextImage,
        prevImage,
      }}>
      {children}
    </GalleryContext.Provider>
  );
}

export function useImageGallery() {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error("useImageGallery must be used within ImageGalleryProvider");
  }
  return context;
}
