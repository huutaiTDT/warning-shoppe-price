/** @format */

import { Button } from "antd";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  currentCount: number; // số item đang hiển thị (items.length)
  onChange: (page: number) => void;
}

function Pagination({
  page,
  pageSize,
  total,
  currentCount,
  onChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className='fixed bottom-0 right-0 left-0 shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-3'>
      <div className='flex items-center justify-between'>
        <span className='text-xs text-gray-400'>
          Hiển thị {currentCount} / {total} mục
        </span>

        <div className='flex items-center gap-2'>
          <Button
            size='middle'
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}>
            Trước
          </Button>

          <span className='text-xs text-gray-400'>
            Trang {page} / {totalPages}
          </span>

          <Button
            size='middle'
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}>
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Pagination;
