/** @format */

import { create } from "zustand";

interface ImageItem {
  src: string;
  alt?: string;
}

interface GalleryStore {
  images: ImageItem[];
  currentIndex: number;
  isOpen: boolean;
  openGallery: (images: ImageItem[], startIndex?: number) => void;
  closeGallery: () => void;
  setCurrentIndex: (index: number) => void;
  nextImage: () => void;
  prevImage: () => void;
}

export const useImageGallery = create<GalleryStore>((set, get) => ({
  images: [],
  currentIndex: 0,
  isOpen: false,

  openGallery: (images, startIndex = 0) =>
    set({ images, currentIndex: startIndex, isOpen: true }),

  closeGallery: () => set({ isOpen: false }),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  nextImage: () => {
    const { images, currentIndex } = get();
    set({ currentIndex: (currentIndex + 1) % images.length });
  },

  prevImage: () => {
    const { images, currentIndex } = get();
    set({ currentIndex: (currentIndex - 1 + images.length) % images.length });
  },
}));
