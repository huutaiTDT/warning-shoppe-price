/** @format */

import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className='space-y-6 max-w-2xl'>
      <Card className='p-6 bg-blue-50 border-blue-200'>
        <h2 className='text-lg font-semibold text-blue-900 mb-2'>About</h2>
        <div className='space-y-2 text-sm text-blue-800'>
          <p>
            <strong>Application:</strong> Affiliate Product Management System
          </p>
          <p>
            <strong>Version:</strong> 1.0.0
          </p>
          <p>
            <strong>Database:</strong> Supabase PostgreSQL
          </p>
          <p>
            <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
          </p>
        </div>
      </Card>
    </div>
  );
}
