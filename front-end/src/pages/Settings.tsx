/** @format */

import { Card, Divider, List, Tag } from "antd";
import appPackage from "../../package.json";

const appInfo = {
  name: "Shoppe Warning Price",
  version: appPackage.version,
  lastUpdatedAt: "16/04/2026",
  updates: [
    "Hoan thien man hinh Crawl History voi du lieu that tu backend",
    "Bo sung API crawl-history va ghi log lich su cho tung lan crawl",
    "Refactor Products: mo chi tiet va form them/sua bang trang rieng thay vi modal",
    "Sua logic filter tren gia niem yet cho dung nghiep vu",
    "Them auto reload cho backend bang nodemon trong moi truong dev",
  ],
};

export default function SettingsPage() {
  return (
    <div className='space-y-4'>
      <Card className='bg-gray-800 border-gray-700'>
        <h2 className='text-white text-base font-semibold m-0'>
          Thong tin he thong
        </h2>

        <div className='mt-4 grid grid-cols-1 md:grid-cols-3 gap-3'>
          <div className='p-3 rounded border border-gray-700 bg-gray-900'>
            <div className='text-xs text-gray-400'>Ung dung</div>
            <div className='text-sm text-white font-medium mt-1'>
              {appInfo.name}
            </div>
          </div>

          <div className='p-3 rounded border border-gray-700 bg-gray-900'>
            <div className='text-xs text-gray-400'>Version hien tai</div>
            <div className='mt-1'>
              <Tag color='green'>v{appInfo.version}</Tag>
            </div>
          </div>

          <div className='p-3 rounded border border-gray-700 bg-gray-900'>
            <div className='text-xs text-gray-400'>Ngay cap nhat</div>
            <div className='text-sm text-white font-medium mt-1'>
              {appInfo.lastUpdatedAt}
            </div>
          </div>
        </div>

        <Divider className='border-gray-700 my-4' />

        <div>
          <div className='text-sm text-white font-medium mb-2'>Cap nhat gi</div>
          <List
            size='small'
            dataSource={appInfo.updates}
            renderItem={(item) => (
              <List.Item className='border-gray-800!'>
                <span className='text-gray-200 text-sm'>- {item}</span>
              </List.Item>
            )}
          />
        </div>
      </Card>
    </div>
  );
}
