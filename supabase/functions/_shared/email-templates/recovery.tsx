/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Redefina a sua password do Saldo+</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>
            <span style={brandDark}>Saldo</span><span style={brandPlus}>+</span>
          </Text>
        </Section>
        <Heading style={h1}>Redefinir password</Heading>
        <Text style={text}>
          Recebemos um pedido para redefinir a password da sua conta Saldo+.
          Clique no botão abaixo para escolher uma nova password.
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Redefinir password
          </Button>
        </Section>
        <Text style={linkFallback}>
          <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
        </Text>
        <Text style={footer}>
          Se não pediu esta alteração, pode ignorar este email — a sua password
          continua a mesma.
        </Text>
        <Text style={footerMuted}>
          Precisa de ajuda? Contacte{' '}
          <Link href="mailto:contactosaldoplus@gmail.com" style={link}>
            contactosaldoplus@gmail.com
          </Link>
          .
        </Text>
        <Text style={footerBrand}>© Saldo+ · saldoplusapp.com</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
}
const container = { padding: '32px 28px', maxWidth: '560px' }
const header = { marginBottom: '24px' }
const brand = { fontSize: '28px', fontWeight: 700 as const, margin: 0, letterSpacing: '-0.02em' }
const brandDark = { color: '#0F172A' }
const brandPlus = { color: 'hsl(160, 84%, 39%)', fontSize: '32px', fontWeight: 900 as const }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0F172A', margin: '0 0 16px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: 'hsl(160, 84%, 39%)', textDecoration: 'underline' }
const linkFallback = { fontSize: '12px', color: '#94a3b8', wordBreak: 'break-all' as const, margin: '0 0 24px' }
const button = {
  backgroundColor: 'hsl(160, 84%, 39%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '13px', color: '#64748b', margin: '32px 0 8px' }
const footerMuted = { fontSize: '12px', color: '#94a3b8', margin: '0 0 24px' }
const footerBrand = { fontSize: '11px', color: '#cbd5e1', margin: '24px 0 0', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }
