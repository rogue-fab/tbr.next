import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { DebugPanel } from '../../components/debug/DebugPanel';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '../../lib/adminAuth';

export const metadata: Metadata = {
  title: 'Debug Panel - Tube Bender Reviews',
  description: 'Debug and diagnostic information',
  robots: 'noindex, nofollow'
};

export default function DebugPage() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminSession(token)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Debug Panel</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Environment checks, API testing, and diagnostic information
            </p>
          </div>
          
          <DebugPanel />
        </div>
      </div>
    </div>
  );
}
