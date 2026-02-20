import Head from "next/head";

// Bootstrap imports, light and dark themes:
import "bootswatch/dist/united/bootstrap.min.css";
import "../styles/bootstrap.dark_united.css";

// Global styles
import "../styles/globals.css";
import "../styles/landing_page_styles.css";

// Import react-select dark theme globally
import "../styles/react_select_dark.css";
// Import react-date-range dark theme globally
import "../styles/react_date_range_dark.css";

// ES search UI styles
import "../styles/elastic_search_ui.css";

// Need this for FA to work with favicons
import "@fortawesome/fontawesome-svg-core/styles.css";

import ls from "local-storage";

// pages/_app.js
import { ThemeProvider } from "next-themes";

const App = ({ Component, pageProps }) => {
  const theme = ls.get("theme");

  return (
    <>
      <Head>
        <link rel="shortcut icon" href="/images/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/images/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/images/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/images/favicon-16x16.png"
        />

        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <meta name="theme-color" content="#000000" />
        <meta
          name="description"
          content="Open analytics web-site for college basketball"
        />
      </Head>
      <ThemeProvider enableSystem={theme == "system"} defaultTheme="dark">
        <Component {...pageProps} />
      </ThemeProvider>
    </>
  );
};

export default App;
