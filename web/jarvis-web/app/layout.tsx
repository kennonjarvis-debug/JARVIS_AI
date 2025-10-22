import { Providers } from "./providers";
import Chatbot from "../components/Chatbot";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";

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
      </head>
      <body>
        <Providers>
          {children}
          <Chatbot />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
