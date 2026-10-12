import * as React from 'react'
import { Body, Column, Container, Head, Html, Preview, Row, Text } from '@react-email/components'

// Relevo brand palette (PRD §13): ivory background, white surface, forest green
// primary, soft borders. Single legible font family (Sora with fallbacks).
export const brand = {
  ivory: '#F6F4EE',
  surface: '#FFFFFF',
  forest: '#244B3D',
  softGreen: '#E4EDE4',
  text: '#202B25',
  secondary: '#5C685F',
  border: '#D8DED5',
}

const fontFamily = "'Sora', Arial, Helvetica, sans-serif"

export const styles = {
  h1: {
    fontSize: '22px',
    fontWeight: 700 as const,
    color: brand.forest,
    margin: '24px 0 12px',
    letterSpacing: '-0.02em',
  },
  text: {
    fontSize: '14px',
    color: brand.text,
    lineHeight: '1.6',
    margin: '0 0 16px',
  },
  link: { color: brand.forest, textDecoration: 'underline' },
  button: {
    backgroundColor: brand.forest,
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 600 as const,
    borderRadius: '999px',
    padding: '12px 24px',
    textDecoration: 'none',
  },
  note: { fontSize: '12px', color: brand.secondary, lineHeight: '1.5', margin: '24px 0 0' },
}

function SproutMark() {
  return (
    <div
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        backgroundColor: brand.forest,
        textAlign: 'center' as const,
      }}
    >
      {/* Lucide "sprout" icon, inline SVG (decorative; clients without SVG still
          show the green mark and the wordmark). */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginTop: '8px' }}
        aria-hidden="true"
      >
        <path d="M7 20h10" />
        <path d="M10 20c5.5-2.5.8-6.4 3-10" />
        <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
        <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
      </svg>
    </div>
  )
}

function BrandHeader() {
  return (
    <Row>
      <Column style={{ width: '36px', verticalAlign: 'middle' }}>
        <SproutMark />
      </Column>
      <Column style={{ verticalAlign: 'middle', paddingLeft: '10px' }}>
        <Text
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: brand.text,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Relevo
        </Text>
      </Column>
    </Row>
  )
}

function BrandFooter() {
  return (
    <Text
      style={{
        fontSize: '12px',
        color: brand.secondary,
        borderTop: `1px solid ${brand.border}`,
        paddingTop: '16px',
        margin: '32px 0 0',
      }}
    >
      Relevo — Deja tu casa en buenas manos
    </Text>
  )
}

// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #244B3D !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: #244B3D !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: #244B3D !important; color: #ffffff !important; }
`

export function EmailShell({
  preview,
  children,
}: {
  preview: string
  children: React.ReactNode
}) {
  return (
    <Html lang="es" dir="ltr">
      <Head>
        {/* Clients that support web fonts pick up Sora; the rest use the fallback. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{darkModeCss}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: brand.ivory,
          fontFamily,
          margin: 0,
          padding: '32px 12px',
        }}
      >
        <Container
          style={{
            maxWidth: '520px',
            margin: '0 auto',
            backgroundColor: brand.surface,
            border: `1px solid ${brand.border}`,
            borderRadius: '16px',
            padding: '28px 28px 24px',
          }}
        >
          <BrandHeader />
          {children}
          <BrandFooter />
        </Container>
      </Body>
    </Html>
  )
}
