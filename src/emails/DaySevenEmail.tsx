import { Button, Heading, Text, Section } from '@react-email/components'
import * as React from 'react'
import NamaEmailBase from './NamaEmailBase'

interface DaySevenEmailProps {
  name: string
}

const styles = {
  h1: {
    color: '#F1F5F9',
    fontSize: '26px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    lineHeight: '1.3',
  },
  badge: {
    color: '#10B981',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '1.5px',
    textTransform: 'uppercase' as const,
    margin: '0 0 24px 0',
  },
  body: {
    color: '#CBD5E1',
    fontSize: '15px',
    lineHeight: '1.7',
    margin: '0 0 20px 0',
  },
  checklistLabel: {
    color: '#F1F5F9',
    fontSize: '14px',
    fontWeight: '700',
    margin: '0 0 14px 0',
  },
  checkRow: {
    display: 'flex' as const,
    alignItems: 'flex-start' as const,
    margin: '0 0 12px 0',
  },
  checkBox: {
    width: '18px',
    height: '18px',
    border: '2px solid #334155',
    borderRadius: '4px',
    marginRight: '12px',
    marginTop: '2px',
    flexShrink: 0,
    display: 'inline-block' as const,
  },
  checkText: {
    color: '#CBD5E1',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0,
  },
  nudge: {
    color: '#94A3B8',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '20px 0 0 0',
    fontStyle: 'italic',
  },
  ctaLabel: {
    color: '#F1F5F9',
    fontSize: '15px',
    fontWeight: '700',
    margin: '28px 0 16px 0',
  },
  buttonRow: {
    margin: '0 0 12px 0',
  },
  buttonPrimary: {
    backgroundColor: '#10B981',
    color: '#0F172A',
    padding: '14px 32px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '15px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    color: '#10B981',
    padding: '12px 28px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    textDecoration: 'none',
    display: 'inline-block',
    border: '1px solid #10B981',
  },
  smallText: {
    color: '#64748B',
    fontSize: '13px',
    lineHeight: '1.6',
    margin: '20px 0 0 0',
  },
}

export default function DaySevenEmail({ name }: DaySevenEmailProps) {
  const firstName = name.split(' ')[0]
  return (
    <NamaEmailBase previewText="Is NAMA working for you? Let's make sure.">
      <Text style={styles.badge}>Week 1 · Check-in</Text>
      <Heading style={styles.h1}>Is NAMA working for you, {firstName}?</Heading>
      <Text style={styles.body}>
        It&apos;s been a week since you joined NAMA OS. We want to make sure you&apos;re getting
        real value — not just a pretty dashboard.
      </Text>

      <Text style={styles.checklistLabel}>Quick self-check:</Text>

      <Section style={styles.checkRow}>
        <span style={styles.checkBox} />
        <Text style={styles.checkText}>Have you added a real lead yet?</Text>
      </Section>
      <Section style={styles.checkRow}>
        <span style={styles.checkBox} />
        <Text style={styles.checkText}>Have you sent a PDF quote to a client?</Text>
      </Section>
      <Section style={styles.checkRow}>
        <span style={styles.checkBox} />
        <Text style={styles.checkText}>
          Have you used NAMA Copilot to draft an itinerary or score leads?
        </Text>
      </Section>

      <Text style={styles.nudge}>
        No worries if not — let&apos;s do it together in 10 minutes. A short call is all it takes
        to unlock the parts of NAMA that actually move your business.
      </Text>

      <Text style={styles.ctaLabel}>Let&apos;s make sure NAMA works for you:</Text>

      <Section style={styles.buttonRow}>
        <Button
          href="mailto:hi@getnama.app?subject=Setup+Call"
          style={styles.buttonPrimary}
        >
          Book a 15-min setup call →
        </Button>
      </Section>
      <Section style={styles.buttonRow}>
        <Button href="https://getnama.app/dashboard" style={styles.buttonSecondary}>
          Open dashboard
        </Button>
      </Section>

      <Text style={styles.smallText}>
        Or just reply to this email — we&apos;re a small team and we actually read everything. If
        something isn&apos;t working, tell us and we&apos;ll fix it.
      </Text>
    </NamaEmailBase>
  )
}

DaySevenEmail.PreviewProps = {
  name: 'Prateek Mehta',
} as DaySevenEmailProps
