import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from '@react-email/components'
import * as React from 'react'

interface NamaEmailBaseProps {
  previewText: string
  children: React.ReactNode
}

const baseStyles = {
  body: {
    backgroundColor: '#0F172A',
    margin: 0,
    padding: 0,
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
  },
  container: {
    maxWidth: '560px',
    margin: '40px auto',
    backgroundColor: '#1E293B',
    borderRadius: '12px',
    overflow: 'hidden' as const,
  },
  header: {
    backgroundColor: '#0F172A',
    padding: '24px 32px',
    borderBottom: '1px solid #10B981',
  },
  logo: {
    color: '#10B981',
    fontSize: '20px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    margin: 0,
  },
  logoSub: {
    color: '#64748B',
    fontSize: '11px',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    margin: '2px 0 0 0',
  },
  content: {
    padding: '32px',
  },
  footer: {
    padding: '24px 32px',
    borderTop: '1px solid #334155',
    backgroundColor: '#0F172A',
  },
  footerText: {
    color: '#475569',
    fontSize: '12px',
    margin: 0,
    lineHeight: '1.6',
  },
  unsubscribe: {
    color: '#475569',
    fontSize: '11px',
  },
}

export default function NamaEmailBase({ previewText, children }: NamaEmailBaseProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseStyles.body}>
        <Container style={baseStyles.container}>
          <Section style={baseStyles.header}>
            <Text style={baseStyles.logo}>NAMA OS</Text>
            <Text style={baseStyles.logoSub}>AI Travel Command Centre</Text>
          </Section>
          <Section style={baseStyles.content}>
            {children}
          </Section>
          <Section style={baseStyles.footer}>
            <Text style={baseStyles.footerText}>
              You received this because you signed up for NAMA OS.{' '}
              <Link href="mailto:hi@getnama.app?subject=STOP" style={baseStyles.unsubscribe}>
                Reply STOP to unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
