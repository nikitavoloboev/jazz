import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/themeProvider";

import { Inter, Manrope } from "next/font/google";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

// If loading a variable font, you don't need to specify the font weight
const manrope = Manrope({
    subsets: ["latin"],
    variable: "--font-manrope",
    display: "swap",
});

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

const metaTags = {
    title: "garden computing",
    description:
        "Computers are magic. So why do we put up with so much complexity? We believe just a few new ideas can make all the difference.",
    url: "https://gcmp.io/",
};

export const metadata: Metadata = {
    // metadataBase is a convenience option to set a base URL prefix for metadata fields that require a fully qualified URL.
    metadataBase: new URL(metaTags.url),
    title: {
        template: "%s | garden computing",
        default: metaTags.title,
    },
    applicationName: "garden computing",
    description: metaTags.description,
    openGraph: {
        title: metaTags.title,
        description: metaTags.description,
        url: metaTags.url,
        siteName: "garden computing",
        // images: [
        //     {
        //         url: "/social-image.png",
        //         width: 1200,
        //         height: 630,
        //     },
        // ],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body
                className={[
                    manrope.variable,
                    inter.className,
                    "flex flex-col items-center [&_*]:scroll-mt-[5rem]",
                    "bg-white text-stone-700 dark:text-stone-400 dark:bg-stone-950",
                ].join(" ")}
            >
                <SpeedInsights />
                <Analytics />
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <main className="flex flex-col w-full">{children}</main>
                </ThemeProvider>
            </body>
        </html>
    );
}
