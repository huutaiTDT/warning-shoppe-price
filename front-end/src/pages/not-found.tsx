/** @format */

import { Button, Result, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { HomeOutlined, ArrowLeftOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className='min-h-screen bg-[#101828] flex items-center justify-center p-6'>
      <div className='max-w-md w-full'>
        <Result
          status='404'
          title={
            <Title level={1} className='!text-white !m-0 !text-6xl'>
              404
            </Title>
          }
          subTitle={
            <div className='space-y-2 mt-4'>
              <Title level={4} className='!text-gray-300 !m-0'>
                Không tìm thấy trang
              </Title>
              <Text className='text-gray-500 block'>
                Trang bạn đang tìm kiếm có thể đã bị xóa, thay đổi tên hoặc tạm thời không khả dụng.
              </Text>
            </div>
          }
          extra={
            <div className='flex flex-col sm:flex-row gap-3 justify-center mt-6'>
              <Button
                size='large'
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                className='bg-transparent border-gray-700 text-gray-300 hover:!text-emerald-500 hover:!border-emerald-500'
              >
                Quay lại
              </Button>
              <Button
                type='primary'
                size='large'
                icon={<HomeOutlined />}
                onClick={() => navigate("/dashboard")}
                className='bg-emerald-600 border-none hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'
              >
                Về trang chủ
              </Button>
            </div>
          }
        />
        
        {/* Decorative elements */}
        <div className='absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-20'>
          <div className='absolute top-[10%] left-[10%] w-64 h-64 bg-emerald-500/20 rounded-full blur-[120px]' />
          <div className='absolute bottom-[10%] right-[10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[150px]' />
        </div>
      </div>
    </div>
  );
}
