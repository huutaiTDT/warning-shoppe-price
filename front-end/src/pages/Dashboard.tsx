/** @format */

import { useEffect, useState } from "react";

export default function Dashboard() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return "Chào buổi sáng ☀️";
    if (hour < 18) return "Chào buổi chiều 🌤️";
    return "Chào buổi tối 🌙";
  };

  return (
    <div
      style={{
        padding: 20,
        margin: 20,
      }}
      className='flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl'>
      <div>
        <div className='text-lg font-semibold  dark:text-white'>
          {getGreeting()}
        </div>
        <div className='text-sm text-gray-500'>
          Xin chào, hôm nay là một ngày tuyệt vời 🚀
        </div>
      </div>

      <div className='text-right'>
        <div className='text-xl font-bold text-blue-500'>
          {time.toLocaleTimeString()}
        </div>
        <div className='text-xs text-gray-400'>{time.toLocaleDateString()}</div>
      </div>
    </div>
  );
}
