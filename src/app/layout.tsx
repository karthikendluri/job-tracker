import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobTracker — AI Job Search & Application Tracker',
  description: 'Find jobs matching your resume and track every application.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
