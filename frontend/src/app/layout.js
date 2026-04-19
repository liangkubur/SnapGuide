// frontend/src/app/layout.js
import './globals.css';

export const metadata = {
  title: 'SnapGuide – Automatic Tutorial Generator',
  description: 'Record web interactions and generate beautiful step-by-step tutorials automatically.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
