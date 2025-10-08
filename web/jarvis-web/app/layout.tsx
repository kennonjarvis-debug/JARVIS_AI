export const metadata = {
  title: "Jarvis",
  description: "Jarvis Web",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0b0f17" />
        <link rel="apple-touch-icon" href="/icons/icon-512x512.png" />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function(){});
            });
          }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
