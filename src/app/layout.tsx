import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobTracker — AI Job Search & Application Tracker',
  description: 'Find jobs matching your resume with AI. Track every application from saved to offer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
