/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>O seu código de verificação Saldo+</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>
            <span style={brandDark}>Saldo</span><span style={brandPlus}>+</span>
          </Text>
        </Section>
        <Heading style={h1}>Código de verificação</Heading>
        <Text style={text}>
          Use o código abaixo para confirmar a sua identidade:
        </Text>
        <Section style={codeBox}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Text style={footer}>
          Este código expira em breve. Se não pediu esta ação, ignore este
          email com segurança.
        </Text>
        <Text style={footerMuted}>
          Precisa de ajuda?{' '}
          <Link href="mailto:contactosaldoplus@gmail.com" style={link}>
            contactosaldoplus@gmail.com
          </Link>
        </Text>
        <Text style={footerBrand}>© Saldo+ · saldoplusapp.com</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const header = { marginBottom: '24px' }
const brand = { fontSize: '28px', fontWeight: 700 as const, margin: 0, letterSpacing: '-0.02em' }
const brandDark = { color: '#0F172A' }
const brandPlus = { color: 'hsl(160, 84%, 39%)', fontSize: '32px', fontWeight: 900 as const }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0F172A', margin: '0 0 16px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: 'hsl(160, 84%, 39%)', textDecoration: 'underline' }
const codeBox = { backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '20px', textAlign: 'center' as const, margin: '0 0 24px' }
const codeStyle = { fontFamily: '"IBM Plex Mono", Courier, monospace', fontSize: '32px', fontWeight: 700 as const, color: '#0F172A', letterSpacing: '0.3em', margin: 0 }
const footer = { fontSize: '13px', color: '#64748b', margin: '0 0 8px' }
const footerMuted = { fontSize: '12px', color: '#94a3b8', margin: '0 0 24px' }
const footerBrand = { fontSize: '11px', color: '#cbd5e1', margin: '24px 0 0', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }
