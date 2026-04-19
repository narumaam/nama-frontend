import { Button, Heading, Text, Section } from '@react-email/components'
import * as React from 'react'
import NamaEmailBase from './NamaEmailBase'

interface DayThreeEmailProps {
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
  highlight: {
    color: '#F1F5F9',
    fontWeight: '600',
  },
  storiesLabel: {
    color: '#F1F5F9',
    fontSize: '14px',
    fontWeight: '700',
    margin: '0 0 12px 0',
  },
  storyCard: {
    backgroundColor: '#0F172A',
    borderRadius: '10px',
    padding: '20px 24px',
    margin: '0 0 12px 0',
    borderLeft: '3px solid #10B981',
  },
  storyQuote: {
    color: '#CBD5E1',
    fontSize: '14px',
    lineHeight: '1.6',
    fontStyle: 'italic',
    margin: '0 0 10px 0',
  },
  storyMeta: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  storyType: {
    color: '#64748B',
    fontSize: '12px',
    fontWeight: '600',
    margin: 0,
  },
  storyResult: {
    color: '#10B981',
    fontSize: '13px',
    fontWeight: '700',
    margin: 0,
  },
  cta: {
    color: '#CBD5E1',
    fontSize: '15px',
    lineHeight: '1.7',
    margin: '20px 0 0 0',
  },
  buttonWrap: {
    margin: '28px 0 24px 0',
    textAlign: 'center' as const,
  },
  button: {
    backgroundColor: '#10B981',
    color: '#0F172A',
    padding: '14px 32px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '15px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  smallText: {
    color: '#64748B',
    fontSize: '13px',
    lineHeight: '1.6',
    margin: 0,
  },
}

export default function DayThreeEmail({ name }: DayThreeEmailProps) {
  const firstName = name.split(' ')[0]
  return (
    <NamaEmailBase previewText="3 agencies closed ₹2L+ deals in their first 72 hours on NAMA">
      <Text style={styles.badge}>Day 3 · Social Proof</Text>
      <Heading style={styles.h1}>₹2 lakh in 72 hours. Really.</Heading>
      <Text style={styles.body}>
        Three agencies on NAMA closed their first{' '}
        <span style={styles.highlight}>₹2L+ deals within 72 hours</span> of going live — by doing
        one thing: adding their real leads into the system.
      </Text>

      <Text style={styles.storiesLabel}>Here&apos;s what happened:</Text>

      <Section style={styles.storyCard}>
        <Text style={styles.storyQuote}>
          &quot;I added 5 leads from WhatsApp. NAMA scored them, I called the top 2, and closed a
          Maldives honeymoon package the same afternoon.&quot;
        </Text>
        <Section style={styles.storyMeta}>
          <Text style={styles.storyType}>Boutique Bali specialist · Mumbai</Text>
          <Text style={styles.storyResult}>12 leads triaged · 3 closed</Text>
        </Section>
      </Section>

      <Section style={styles.storyCard}>
        <Text style={styles.storyQuote}>
          &quot;Sent 8 PDF quotes in our first week — each one took under a minute. Clients kept
          commenting on how professional they looked.&quot;
        </Text>
        <Section style={styles.storyMeta}>
          <Text style={styles.storyType}>Honeymoon specialist · Bangalore</Text>
          <Text style={styles.storyResult}>8 quotes sent · ₹4.2L pipeline</Text>
        </Section>
      </Section>

      <Text style={styles.cta}>
        {firstName}, your workspace is live. The only thing missing is{' '}
        <span style={styles.highlight}>your first real lead</span>.
      </Text>

      <Section style={styles.buttonWrap}>
        <Button href="https://getnama.app/dashboard/leads" style={styles.button}>
          Add your first lead now →
        </Button>
      </Section>
      <Text style={styles.smallText}>
        Takes under 60 seconds. Then let the AI do the rest.
      </Text>
    </NamaEmailBase>
  )
}

DayThreeEmail.PreviewProps = {
  name: 'Prateek Mehta',
} as DayThreeEmailProps
