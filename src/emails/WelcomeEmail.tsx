import { Button, Heading, Text, Section } from '@react-email/components'
import * as React from 'react'
import NamaEmailBase from './NamaEmailBase'

interface WelcomeEmailProps {
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
  tagline: {
    color: '#10B981',
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '1px',
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
  featureRow: {
    margin: '6px 0',
    color: '#CBD5E1',
    fontSize: '14px',
  },
  featureIcon: {
    color: '#10B981',
    marginRight: '8px',
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

export default function WelcomeEmail({ name, agencyName }: WelcomeEmailProps) {
  const firstName = name.split(' ')[0]
  return (
    <NamaEmailBase
      previewText={`Welcome to NAMA OS, ${firstName} — your AI-powered travel command centre is ready`}
    >
      <Heading style={styles.h1}>Welcome to NAMA OS, {firstName} 🚀</Heading>
      <Text style={styles.tagline}>Your agency. Supercharged.</Text>
      <Text style={styles.body}>
        <span style={styles.highlight}>{agencyName}</span> is now live on NAMA OS — India&apos;s
        first AI-native travel agency operating system.
      </Text>
      <Text style={styles.body}>Here&apos;s what&apos;s waiting for you:</Text>
      <Text style={styles.featureRow}>
        <span style={styles.featureIcon}>⚡</span>
        <span style={styles.highlight}>AI Lead Scoring</span> — every WhatsApp/email lead gets
        triaged in seconds
      </Text>
      <Text style={styles.featureRow}>
        <span style={styles.featureIcon}>🤖</span>
        <span style={styles.highlight}>NAMA Copilot</span> — your AI that builds itineraries,
        prices quotes, answers clients
      </Text>
      <Text style={styles.featureRow}>
        <span style={styles.featureIcon}>📊</span>
        <span style={styles.highlight}>Live Dashboard</span> — revenue, pipeline, team performance
        at a glance
      </Text>
      <Text style={styles.featureRow}>
        <span style={styles.featureIcon}>📄</span>
        <span style={styles.highlight}>One-click PDF Quotes</span> — professional proposals in 30
        seconds
      </Text>
      <Section style={styles.buttonWrap}>
        <Button href="https://getnama.app/dashboard" style={styles.button}>
          Open Your Dashboard →
        </Button>
      </Section>
      <Text style={styles.smallText}>
        Questions? Just reply to this email — we read every one.
      </Text>
    </NamaEmailBase>
  )
}

WelcomeEmail.PreviewProps = {
  name: 'Prateek Mehta',
  agencyName: 'Wanderlust Travels',
} as WelcomeEmailProps
