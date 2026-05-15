/** @format */

import { guidesAPI } from "@/services/api";
import { ArrowRightOutlined, BookOutlined } from "@ant-design/icons";

import { Card, Col, Empty, Row, Skeleton, Tag, Typography } from "antd";

import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

const { Title, Text } = Typography;

export default function GuidesPage() {
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await guidesAPI.list(1, 100);

        if (mounted) setItems(res.data.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div
      style={{
        padding: 24,
        minHeight: "100vh",
      }}>
      {/* Header */}
      <div
        style={{
          marginBottom: 24,
        }}>
        <Title
          level={2}
          style={{
            marginBottom: 4,
          }}>
          📚 Guides Center
        </Title>

        <Text type='secondary'>Danh sách hướng dẫn và tài liệu hệ thống</Text>
      </div>

      <Skeleton loading={loading} active>
        {items.length === 0 ?
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
            }}>
            <Empty description='Không có guide nào' />
          </Card>
        : <Row gutter={[20, 20]}>
            {items.map((item: any) => (
              <Col xs={24} sm={24} md={12} lg={8} xl={6} key={item.id}>
                <Link to={`/dashboard/guides/${item.id}`}>
                  <Card
                    hoverable
                    bordered={false}
                    style={{
                      borderRadius: 20,
                      overflow: "hidden",
                      height: "100%",
                      transition: "all 0.2s ease",
                    }}
                    bodyStyle={{
                      padding: 20,
                    }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 16,
                      }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 16,
                          background: "linear-gradient(135deg,#1677ff,#69b1ff)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 22,
                        }}>
                        <BookOutlined />
                      </div>

                      <Tag color='blue'>{item.code}</Tag>
                    </div>

                    <Title
                      level={5}
                      ellipsis={{
                        rows: 2,
                      }}
                      style={{
                        marginBottom: 12,
                        minHeight: 48,
                      }}>
                      {item.title}
                    </Title>

                    <Text
                      type='secondary'
                      style={{
                        display: "block",
                        minHeight: 66,
                      }}>
                      {item.description ||
                        "Tài liệu hướng dẫn sử dụng hệ thống và các quy trình liên quan."}
                    </Text>

                    <div
                      style={{
                        marginTop: 20,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                      <Text strong>Xem chi tiết</Text>

                      <ArrowRightOutlined
                        style={{
                          color: "#1677ff",
                        }}
                      />
                    </div>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        }
      </Skeleton>
    </div>
  );
}
