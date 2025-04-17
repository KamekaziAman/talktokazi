import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Add meta tags */}
        <meta name="description" content="TalkToKazi - Secure messaging application" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
} 