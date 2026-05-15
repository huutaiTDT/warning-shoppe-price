/** @format */

import { useEffect, useState } from "react";

import { useImageGallery } from "@/contexts/ImageGalleryContext";

import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CloseOutlined,
  DownloadOutlined,
  RotateRightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";

import { Button, Modal } from "antd";

export default function ImageGalleryModal() {
  const { images, currentIndex, isOpen, closeGallery, nextImage, prevImage } =
    useImageGallery();

  const [scale, setScale] = useState(1);

  const [rotate, setRotate] = useState(0);

  const [dragging, setDragging] = useState(false);

  const [position, setPosition] = useState({
    x: 0,
    y: 0,
  });

  const [start, setStart] = useState({
    x: 0,
    y: 0,
  });

  const currentImage = images[currentIndex];

  // Reset state when image changes
  useEffect(() => {
    setScale(1);

    setRotate(0);

    setPosition({
      x: 0,
      y: 0,
    });
  }, [currentIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closeGallery();
          break;

        case "ArrowRight":
          nextImage();
          break;

        case "ArrowLeft":
          prevImage();
          break;

        case "+":
        case "=":
          zoomIn();
          break;

        case "-":
          zoomOut();
          break;

        case "r":
          rotateImage();
          break;
      }
    };

    document.addEventListener("keydown", handleKey);

    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 5));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const rotateImage = () => {
    setRotate((prev) => prev + 90);
  };

  const resetTransform = () => {
    setScale(1);

    setRotate(0);

    setPosition({
      x: 0,
      y: 0,
    });
  };

  const downloadImage = async () => {
    try {
      const link = document.createElement("a");

      link.href = currentImage.src;

      link.download = currentImage.alt || `image-${currentIndex + 1}`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    }
  };

  // Drag image
  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;

    setDragging(true);

    setStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;

    setPosition({
      x: e.clientX - start.x,
      y: e.clientY - start.y,
    });
  };

  const onMouseUp = () => {
    setDragging(false);
  };

  if (!isOpen || !images.length || !currentImage) return null;

  return (
    <Modal
      open={isOpen}
      footer={null}
      closable={false}
      onCancel={closeGallery}
      width='100vw'
      centered
      styles={{
        body: {
          padding: 0,
          height: "100vh",
          background: "#000",
          overflow: "hidden",
        },

        mask: {
          background: "rgba(0,0,0,0.96)",
          backdropFilter: "blur(6px)",
        },

        content: {
          background: "transparent",
          boxShadow: "none",
        },
      }}>
      <div
        style={{
          width: "100%",
          height: "100vh",
          position: "relative",
          overflow: "hidden",
          userSelect: "none",
        }}>
        {/* HEADER */}
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            right: 20,
            zIndex: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
          {/* Counter */}
          <div
            style={{
              color: "#fff",
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(10px)",
              padding: "10px 16px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
            }}>
            {currentIndex + 1} / {images.length}
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 10,
            }}>
            <ActionButton icon={<ZoomOutOutlined />} onClick={zoomOut} />

            <ActionButton icon={<ZoomInOutlined />} onClick={zoomIn} />

            <ActionButton
              icon={<RotateRightOutlined />}
              onClick={rotateImage}
            />

            <ActionButton icon={<DownloadOutlined />} onClick={downloadImage} />

            <ActionButton
              icon={<CloseOutlined />}
              onClick={closeGallery}
              danger
            />
          </div>
        </div>

        {/* IMAGE CONTAINER */}
        <div
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            cursor:
              scale > 1 ?
                dragging ? "grabbing"
                : "grab"
              : "default",
          }}>
          <img
            src={currentImage.src}
            alt={currentImage.alt || `Slide ${currentIndex + 1}`}
            onMouseDown={onMouseDown}
            onDoubleClick={() => {
              if (scale === 1) {
                setScale(2);
              } else {
                resetTransform();
              }
            }}
            draggable={false}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
              transition: dragging ? "none" : "transform 0.25s ease",
              transform: `
                translate(${position.x}px, ${position.y}px)
                scale(${scale})
                rotate(${rotate}deg)
              `,
              borderRadius: 18,
              boxShadow: "0 25px 80px rgba(0,0,0,0.45)",
            }}
          />
        </div>

        {/* LEFT NAV */}
        {images.length > 1 && (
          <>
            <NavButton direction='left' onClick={prevImage} />

            <NavButton direction='right' onClick={nextImage} />
          </>
        )}

        {/* BOTTOM THUMBNAILS */}
        {images.length > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 10,
              maxWidth: "90vw",
              overflowX: "auto",
              padding: "10px 14px",
              borderRadius: 18,
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
            }}>
            {images.map((img, index) => (
              <img
                key={index}
                src={img.src}
                alt=''
                onClick={() => {
                  if (index > currentIndex) {
                    nextImage();
                  } else if (index < currentIndex) {
                    prevImage();
                  }
                }}
                style={{
                  width: 70,
                  height: 70,
                  objectFit: "cover",
                  borderRadius: 10,
                  cursor: "pointer",
                  border:
                    index === currentIndex ? "3px solid white" : (
                      "2px solid transparent"
                    ),
                  opacity: index === currentIndex ? 1 : 0.6,
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ActionButton({ icon, onClick, danger = false }: any) {
  return (
    <Button
      type='text'
      icon={icon}
      onClick={onClick}
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        color: danger ? "#ff7875" : "#fff",
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.08)",
        fontSize: 18,
      }}
    />
  );
}

function NavButton({ direction, onClick }: any) {
  return (
    <Button
      type='text'
      onClick={onClick}
      icon={
        direction === "left" ? <ArrowLeftOutlined /> : <ArrowRightOutlined />
      }
      style={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        left: direction === "left" ? 24 : "auto",
        right: direction === "right" ? 24 : "auto",
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(8px)",
        color: "#fff",
        fontSize: 24,
        border: "1px solid rgba(255,255,255,0.08)",
        zIndex: 10,
      }}
    />
  );
}
