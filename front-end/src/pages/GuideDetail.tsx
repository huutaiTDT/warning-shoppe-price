/** @format */

import { useImageGallery } from "@/contexts/ImageGalleryContext";
import { guidesAPI } from "@/services/api";

import {
  ArrowLeftOutlined,
  BookOutlined,
  CalendarOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

import { Button, Card, Empty, Skeleton, Space, Tag, Typography } from "antd";

import { useEffect, useRef, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

const { Title, Text } = Typography;

export default function GuideDetail() {
  const { id } = useParams();

  const navigate = useNavigate();
  const { openGallery } = useImageGallery();

  const [item, setItem] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!id) return;

        const res = await guidesAPI.get(id as string);

        if (mounted) setItem(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  // Setup click listeners on images
  useEffect(() => {
    if (!contentRef.current) return;

    const handleImageClick = (e: Event) => {
      const target = e.target as HTMLImageElement;
      if (target.tagName !== "IMG") return;

      // Collect all images in the content
      const images = Array.from(
        contentRef.current?.querySelectorAll("img") || [],
      ).map((img: any) => ({
        src: img.src,
        alt: img.alt,
      }));

      // Find current image index
      const currentIndex = images.findIndex((img) => img.src === target.src);

      // Open gallery
      if (images.length > 0) {
        openGallery(images, currentIndex >= 0 ? currentIndex : 0);
      }
    };

    const images = contentRef.current?.querySelectorAll("img");
    images?.forEach((img) => {
      img.style.cursor = "pointer";
      img.addEventListener("click", handleImageClick);
    });

    return () => {
      images?.forEach((img) => {
        img.removeEventListener("click", handleImageClick);
      });
    };
  }, [item, openGallery]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
      }}>
      {/* Back Button */}
      <Button
        type='text'
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{
          marginBottom: 20,
          fontWeight: 600,
        }}>
        Quay lại
      </Button>

      <Skeleton loading={loading} active>
        {item ?
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
            }}>
            {/* Hero */}
            <Card
              bordered={false}
              style={{
                borderRadius: 28,
                overflow: "hidden",
                marginBottom: 24,
                background: "linear-gradient(135deg,#1677ff,#69b1ff)",
                boxShadow: "0 16px 40px rgba(22,119,255,0.18)",
              }}
              bodyStyle={{
                padding: 32,
              }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 20,
                  flexWrap: "wrap",
                }}>
                <div>
                  <Space
                    align='center'
                    size={12}
                    style={{
                      marginBottom: 16,
                    }}>
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 18,
                        background: "rgba(255,255,255,0.18)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                        backdropFilter: "blur(8px)",
                      }}>
                      <BookOutlined />
                    </div>

                    <Tag
                      color='gold'
                      style={{
                        borderRadius: 999,
                        padding: "4px 12px",
                        fontWeight: 600,
                      }}>
                      GUIDE
                    </Tag>
                  </Space>

                  <Title
                    level={2}
                    style={{
                      color: "#fff",
                      marginBottom: 12,
                    }}>
                    {item.title}
                  </Title>

                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 1.7,
                    }}>
                    {item.description ||
                      "Tài liệu hướng dẫn chi tiết giúp người dùng thao tác và sử dụng hệ thống hiệu quả hơn."}
                  </Text>
                </div>

                <div
                  style={{
                    minWidth: 220,
                  }}>
                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 20,
                      backdropFilter: "blur(10px)",
                    }}
                    bodyStyle={{
                      padding: 18,
                    }}>
                    <Space
                      direction='vertical'
                      size={14}
                      style={{
                        width: "100%",
                      }}>
                      <div>
                        <Text style={{}}>Mã tài liệu</Text>

                        <div
                          style={{
                            fontWeight: 700,
                            marginTop: 4,
                          }}>
                          {item.code}
                        </div>
                      </div>

                      <div>
                        <Text style={{}}>Loại</Text>

                        <div
                          style={{
                            marginTop: 4,
                          }}>
                          Hướng dẫn hệ thống
                        </div>
                      </div>

                      <div>
                        <Text style={{}}>Cập nhật</Text>

                        <div
                          style={{
                            marginTop: 4,
                          }}>
                          <CalendarOutlined />{" "}
                          {item.updatedAt ?
                            new Date(item.updatedAt).toLocaleDateString("vi-VN")
                          : "N/A"}
                        </div>
                      </div>
                    </Space>
                  </Card>
                </div>
              </div>
            </Card>

            {/* Content */}
            <Card
              bordered={false}
              style={{
                borderRadius: 28,
                boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
              }}
              bodyStyle={{
                padding: 36,
              }}>
              <Space
                align='center'
                style={{
                  marginBottom: 24,
                }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#1677ff",
                    fontSize: 20,
                  }}>
                  <FileTextOutlined />
                </div>

                <div>
                  <Title
                    level={4}
                    style={{
                      margin: 0,
                    }}>
                    Nội dung hướng dẫn
                  </Title>

                  <Text type='secondary'>Chi tiết tài liệu</Text>
                </div>
              </Space>

              <div
                ref={contentRef}
                className='guide-content'
                style={{
                  fontSize: 15,
                  lineHeight: 1.9,
                  color: "#374151",
                }}
                dangerouslySetInnerHTML={{
                  __html: item.content || "",
                }}
              />
            </Card>
          </div>
        : <Card
            bordered={false}
            style={{
              borderRadius: 24,
              maxWidth: 600,
              margin: "80px auto",
            }}>
            <Empty description='Không tìm thấy hướng dẫn' />
          </Card>
        }
      </Skeleton>
    </div>
  );
}
