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
import type { TemplateEntry } from './registry.ts'

interface Props {
  fullName?: string
  planLabel?: string
  trialEndsAt?: string // formatted date string (dd/mm/yyyy)
  amountLabel?: string // e.g. "15,99€/mês"
  manageUrl?: string
  appUrl?: string
}

const UTM = '?utm_source=email&utm_medium=welcome&utm_campaign=trial_started'

const WelcomeSubscription = ({
  fullName,
  planLabel = 'Saldo+',
  trialEndsAt,
  amountLabel,
  manageUrl = `https://saldoplusapp.com/app${UTM}&utm_content=manage#account`,
  appUrl = `https://saldoplusapp.com/app${UTM}&utm_content=cta`,
}: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>A sua subscrição Saldo+ está ativa. Bem-vindo!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>
            <span style={brandDark}>Saldo</span>
            <span style={brandPlus}>+</span>
          </Text>
        </Section>

        <Heading style={h1}>
          {fullName ? `Bem-vindo, ${fullName}! 🎉` : 'Bem-vindo ao Saldo+ 🎉'}
        </Heading>
        <Text style={text}>
          O seu cartão foi guardado com segurança e a subscrição está oficialmente
          ativa. Tem <strong>3 dias grátis</strong> para explorar o Saldo+ à vontade
          — só será cobrado depois disso.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Plano escolhido</Text>
          <Text style={cardValue}>{planLabel}</Text>
          {amountLabel && (
            <>
              <Text style={cardLabel}>Valor após o período gratuito</Text>
              <Text style={cardValueSmall}>{amountLabel}</Text>
            </>
          )}
          {trialEndsAt && (
            <>
              <Text style={cardLabel}>Fim do período gratuito</Text>
              <Text style={cardValueSmall}>{trialEndsAt}</Text>
            </>
          )}
        </Section>

        <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
          <Button style={button} href={appUrl}>
            Abrir o Saldo+
          </Button>
        </Section>

        <Text style={text}>
          Pode cancelar a qualquer momento antes do fim dos 3 dias e não é
          cobrado nada. A gestão da subscrição é feita a partir da{' '}
          <Link href={manageUrl} style={link}>área de Conta</Link>.
        </Text>

        <Text style={footer}>
          Dúvidas ou sugestões? Responda a este email ou escreva para{' '}
          <Link href="mailto:contactosaldoplus@gmail.com" style={link}>
            contactosaldoplus@gmail.com
          </Link>
          .
        </Text>
        <Text style={footerBrand}>
          © Saldo+ ·{' '}
          <Link href="https://saldoplusapp.com" style={linkMuted}>
            saldoplusapp.com
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeSubscription,
  subject: 'Bem-vindo ao Saldo+ — subscrição ativa 🎉',
  displayName: 'Boas-vindas / Subscrição ativa',
  previewData: {
    fullName: 'Pedro',
    planLabel: 'Casa+',
    trialEndsAt: '31/07/2026',
    amountLabel: '28,99€/mês',
  },
} satisfies TemplateEntry

export default WelcomeSubscription

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
}
const container = { padding: '32px 28px', maxWidth: '560px' }
const header = { marginBottom: '24px' }
const brand = { fontSize: '28px', fontWeight: 700 as const, margin: 0, letterSpacing: '-0.02em' }
const brandDark = { color: '#0F172A' }
const brandPlus = { color: 'hsl(160, 84%, 39%)', fontSize: '32px', fontWeight: 900 as const }
const h1 = {
  fontSize: '24px',
  fontWeight: 700 as const,
  color: '#0F172A',
  margin: '0 0 16px',
  letterSpacing: '-0.01em',
}
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }
const card = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '20px 24px',
  margin: '24px 0',
}
const cardLabel = {
  fontSize: '12px',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  margin: '8px 0 4px',
  fontWeight: 600 as const,
}
const cardValue = {
  fontSize: '20px',
  color: '#0F172A',
  fontWeight: 700 as const,
  margin: '0 0 8px',
}
const cardValueSmall = { fontSize: '15px', color: '#0F172A', fontWeight: 600 as const, margin: '0 0 4px' }
const link = { color: 'hsl(160, 84%, 39%)', textDecoration: 'underline' }
const linkMuted = { color: '#94a3b8', textDecoration: 'underline' }
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
const footerBrand = {
  fontSize: '11px',
  color: '#cbd5e1',
  margin: '24px 0 0',
  borderTop: '1px solid #e2e8f0',
  paddingTop: '16px',
}
