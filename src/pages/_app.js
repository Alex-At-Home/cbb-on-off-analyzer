import Head from "next/head";

// Bootstrap imports:
//import "bootstrap/dist/css/bootstrap.min.css";
import "bootswatch/dist/united/bootstrap.min.css";

// Global styles
import "../styles/globals.css";

// Need this for FA to work with favicons
import "@fortawesome/fontawesome-svg-core/styles.css";

const App = ({ Component, pageProps }) => (
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
    <Component {...pageProps} />
  </>
);

export default App;
