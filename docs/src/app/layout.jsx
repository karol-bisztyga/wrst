import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";

export const metadata = {
  metadataBase: new URL("https://wrst.dev"),
  title: {
    default: "wrst - build smartwatch apps with React and TypeScript",
    template: "%s - wrst",
  },
  description:
    "Build smartwatch apps with React and TypeScript - one codebase for Wear OS and Apple Watch.",
  applicationName: "wrst",
  generator: "Next.js",
};

export default async function RootLayout({ children }) {
  const navbar = (
    <Navbar
      logo={<b>wrst</b>}
      projectLink="https://github.com/karol-bisztyga/wrst"
    />
  );
  const pageMap = await getPageMap();
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          footer={<Footer>MIT {new Date().getFullYear()} © wrst</Footer>}
          editLink="Edit this page on GitHub"
          docsRepositoryBase="https://github.com/karol-bisztyga/wrst/blob/main/docs"
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          pageMap={pageMap}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
