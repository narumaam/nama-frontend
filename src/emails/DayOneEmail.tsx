import { Button, Heading, Text, Section } from '@react-email/components'
import * as React from 'react'
import NamaEmailBase from './NamaEmailBase'

interface DayOneEmailProps {
  name: string
  agencyName: string
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
  tipsLabel: {
    color: '#F1F5F9',
    fontSize: '15px',
    fontWeight: '700',
    margin: '0 0 16px 0',
  },
  tipRow: {
    display: 'flex' as const,
    margin: '0 0 18px 0',
  },
  tipNumber: {
    color: '#10B981',
    fontSize: '20px',
    fontWeight: '800',
    minWidth: '32px',
    lineHeight: '1.4',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    color: '#F1F5F9',
    fontSize: '14px',
    fontWeight: '700',
    margin: '0 0 4px 0',
  },
  tipBody: {
    color: '#94A3B8',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: 0,
  },
  buttonWrap: {
    margin: '32px 0 24px 0',
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

export default function DayOneEmail({ name, agencyName }: DayOneEmailProps) {
  const firstName = name.split(' ')[0]
  return (
    <NamaEmailBase previewText="One tip that saves hours every week — your NAMA OS day 1 guide">
      <Text style={styles.badge}>Day 1 · Quick Win</Text>
      <Heading style={styles.h1}>One tip that saves hours every week</Heading>
      <Text style={styles.body}>
        Hey {firstName} — most agencies waste 70% of their time on leads that will never convert.
        Here&apos;s how {agencyName} fixes that in your first week on NAMA OS.
      </Text>
      <Text style={styles.tipsLabel}>3 things to do right now:</Text>

      <Section style={styles.tipRow}>
        <Text style={styles.tipNumber}>1</Text>
        <Section style={styles.tipContent}>
          <Text style={styles.tipTitle}>Use NAMA Copilot to auto-generate an itinerary</Text>
          <Text style={styles.tipBody}>
            Paste any lead message into the Copilot chat — it reads the destination, budget, and
            dates and drafts a full day-by-day itinerary in seconds. No more blank-page anxiety.
          </Text>
        </Section>
      </Section>

      <Section style={styles.tipRow}>
        <Text style={styles.tipNumber}>2</Text>
        <Section style={styles.tipContent}>
          <Text style={styles.tipTitle}>Let AI score your leads — focus on HOT first</Text>
          <Text style={styles.tipBody}>
            Open the Leads page and click the AI Score tab. Each lead gets a confidence score
            (0–100) so you can call your highest-intent prospects before they go elsewhere.
          </Text>
        </Section>
      </Section>

      <Section style={styles.tipRow}>
        <Text style={styles.tipNumber}>3</Text>
        <Section style={styles.tipContent}>
          <Text style={styles.tipTitle}>Send a PDF quote in under 60 seconds</Text>
          <Text style={styles.tipBody}>
            From any itinerary, click &quot;Generate Quotation&quot; → &quot;Download PDF&quot;.
            Share a polished, branded proposal before your competitor even replies to the WhatsApp
            message.
          </Text>
        </Section>
      </Section>

      <Section style={styles.buttonWrap}>
        <Button href="https://getnama.app/dashboard/leads" style={styles.button}>
          See Your Leads →
        </Button>
      </Section>
      <Text style={styles.smallText}>
        The agencies that close fastest are the ones that respond first. Let AI do the sorting.
      </Text>
    </NamaEmailBase>
  )
}

DayOneEmail.PreviewProps = {
  name: 'Prateek Mehta',
  agencyName: 'Wanderlust Travels',
} as DayOneEmailProps
