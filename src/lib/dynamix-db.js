import { Pool } from 'pg'

import { dynamixResults, getWeatherForDestination } from '@/lib/dynamix-data'

let pool

function getPool() {
  if (!process.env.DATABASE_URL) {
    return null
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    })
  }

  return pool
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL)
}

async function query(text, params = []) {
  const db = getPool()

  if (!db) {
    throw new Error('DATABASE_URL is not configured')
  }

  return db.query(text, params)
}

function parsePricePerPerson(priceLabel) {
  const numeric = String(priceLabel || '')
    .replace(/[^0-9.]/g, '')

  return Number.parseFloat(numeric || '0')
}

function parseTotalPax(paxLabel) {
  const matches = String(paxLabel || '').match(/\d+/g)
  if (!matches) return 1
  return matches.reduce((sum, item) => sum + Number.parseInt(item, 10), 0)
}

export async function getSearchResults({ destination = 'Bali', packageType, travelerType }) {
  if (!hasDatabase()) {
    const filtered = dynamixResults.filter((item) => {
      const badgeText = item.badges.join(' ').toLowerCase()
      if (packageType && !badgeText.includes(packageType.toLowerCase())) return false
      if (travelerType && !badgeText.includes(travelerType.toLowerCase())) return false
      return true
    })

    return filtered.length ? filtered : dynamixResults
  }

  const result = await query(
    `
      select id, slug, title, summary, price_per_person, currency_code, badges
      from dynamix_holiday_matches
      where lower(title) like lower($1)
      order by price_per_person asc
    `,
    [`%${destination}%`]
  )

  if (!result.rows.length) {
    return dynamixResults
  }

  const normalized = result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    price: `Rs ${Number(row.price_per_person).toLocaleString('en-IN')} per person`,
    badges: Array.isArray(row.badges) ? row.badges : [],
  }))

  const filtered = normalized.filter((item) => {
    const badgeText = item.badges.join(' ').toLowerCase()
    if (packageType && !badgeText.includes(packageType.toLowerCase())) return false
    if (travelerType && !badgeText.includes(travelerType.toLowerCase())) return false
    return true
  })

  return filtered.length ? filtered : normalized
}

export async function createTripSearch(workflow, session = {}) {
  const trip = workflow?.query || {}

  if (!hasDatabase()) {
    return {
      id: `search-${Date.now()}`,
      persisted: false,
    }
  }

  const inserted = await query(
    `
      insert into dynamix_trip_searches (
        agent_email,
        destination,
        duration,
        pax,
        start_date,
        end_date,
        package_type,
        traveler_type
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8)
      returning id
    `,
    [
      session.agentEmail || null,
      trip.destination,
      trip.duration,
      trip.pax,
      trip.startDate || null,
      trip.endDate || null,
      trip.packageType,
      trip.travelerType,
    ]
  )

  return {
    id: inserted.rows[0].id,
    persisted: true,
  }
}

export async function createHolidayMatchesForSearch(searchId, destination = 'Bali') {
  if (!hasDatabase() || !searchId) {
    return dynamixResults.map((item) => ({
      id: null,
      ...item,
    }))
  }

  const existing = await query(
    `
      select id, slug, title, summary, price_per_person, currency_code, badges
      from dynamix_holiday_matches
      where search_id = $1
      order by created_at asc
    `,
    [searchId]
  )

  if (existing.rows.length) {
    return existing.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      price: `Rs ${Number(row.price_per_person).toLocaleString('en-IN')} per person`,
      badges: Array.isArray(row.badges) ? row.badges : [],
    }))
  }

  const seeded = dynamixResults.map((item) => ({
    ...item,
    id: null,
  }))

  for (const item of seeded) {
    const inserted = await query(
      `
        insert into dynamix_holiday_matches (
          search_id,
          slug,
          title,
          summary,
          price_per_person,
          currency_code,
          badges
        )
        values ($1,$2,$3,$4,$5,'INR',$6::jsonb)
        returning id
      `,
      [
        searchId,
        item.slug,
        item.title,
        item.summary,
        parsePricePerPerson(item.price),
        JSON.stringify(item.badges),
      ]
    )

    item.id = inserted.rows[0].id
  }

  return seeded
}

export async function getWeatherSummary(destination = 'Bali') {
  if (!hasDatabase()) {
    return getWeatherForDestination(destination)
  }

  const result = await query(
    `
      select summary, sales_hint
      from dynamix_weather_cache
      where lower(destination) = lower($1)
      order by created_at desc
      limit 1
    `,
    [destination]
  )

  if (!result.rows.length) {
    return getWeatherForDestination(destination)
  }

  return {
    title: 'Weather for selected dates',
    summary: result.rows[0].summary,
    salesHint: result.rows[0].sales_hint || 'Use weather context to position upsells more confidently.',
  }
}

export async function createQuote(workflow, session = {}) {
  const searchId = workflow?.searchId || null
  const holidayMatchId = workflow?.selectedHoliday?.id || null
  const customerEmail = workflow?.quote?.customerEmail?.trim() || null
  const customerWhatsapp = workflow?.quote?.customerWhatsapp?.trim() || null
  const destination = workflow?.query?.destination || 'Bali'
  const holidayTitle = workflow?.selectedHoliday?.title || 'NAMA DYNAMIX Holiday'
  const pricePerPerson = parsePricePerPerson(workflow?.selectedHoliday?.price)
  const markupPerPerson = parsePricePerPerson(workflow?.quote?.markup || '0')
  const totalPax = parseTotalPax(workflow?.query?.pax)
  const message = workflow?.quote?.message || null
  const selectedChannels = Array.isArray(workflow?.quote?.selectedChannels)
    ? workflow.quote.selectedChannels
    : []
  const channels = selectedChannels.filter((channel) => {
    if (channel === 'email') return Boolean(customerEmail)
    if (channel === 'whatsapp') return Boolean(customerWhatsapp)
    return false
  })

  if (!hasDatabase()) {
    return {
      id: `dyn-${Date.now()}`,
      channels,
      persisted: false,
    }
  }

  const inserted = await query(
    `
      insert into dynamix_quotes (
        agent_email,
        customer_email,
        customer_whatsapp,
        search_id,
        holiday_match_id,
        destination,
        holiday_title,
        price_per_person,
        markup_per_person,
        total_pax,
        delivery_channels,
        message,
        status
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,'sent')
      returning id
    `,
    [
      session.agentEmail || null,
      customerEmail,
      customerWhatsapp,
      searchId,
      holidayMatchId,
      destination,
      holidayTitle,
      pricePerPerson,
      markupPerPerson,
      totalPax,
      JSON.stringify(channels),
      message,
    ]
  )

  await query(
    `
      insert into dynamix_quote_events (
        quote_id,
        event_type,
        actor_type,
        actor_email,
        payload
      )
      values ($1,'quote_sent','agent',$2,$3::jsonb)
    `,
    [
      inserted.rows[0].id,
      session.agentEmail || null,
      JSON.stringify({
        destination,
        holidayTitle,
        searchId,
        holidayMatchId,
        channels,
      }),
    ]
  )

  return {
    id: inserted.rows[0].id,
    channels,
    persisted: true,
  }
}

export async function getQuoteById(quoteId) {
  if (!quoteId) return null

  if (!hasDatabase()) {
    return {
      id: quoteId,
      status: 'sent',
      persisted: false,
    }
  }

  const result = await query(
    `
      select
        id,
        status,
        customer_email,
        customer_whatsapp,
        destination,
        holiday_title,
        price_per_person,
        markup_per_person,
        total_pax,
        currency_code,
        delivery_channels,
        message,
        created_at,
        updated_at
      from dynamix_quotes
      where id = $1
      limit 1
    `,
    [quoteId]
  )

  if (!result.rows.length) return null

  const row = result.rows[0]
  return {
    id: row.id,
    status: row.status,
    customerEmail: row.customer_email,
    customerWhatsapp: row.customer_whatsapp,
    destination: row.destination,
    holidayTitle: row.holiday_title,
    pricePerPerson: Number(row.price_per_person || 0),
    markupPerPerson: Number(row.markup_per_person || 0),
    totalPax: row.total_pax,
    currencyCode: row.currency_code,
    deliveryChannels: Array.isArray(row.delivery_channels) ? row.delivery_channels : [],
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    persisted: true,
  }
}

export async function updateQuoteStatus(quoteId, status, session = {}, payload = {}) {
  if (!quoteId || !status) {
    throw new Error('Quote id and status are required')
  }

  if (!hasDatabase()) {
    return {
      id: quoteId,
      status,
      persisted: false,
    }
  }

  const updated = await query(
    `
      update dynamix_quotes
      set status = $2,
          updated_at = now()
      where id = $1
      returning id, status, updated_at
    `,
    [quoteId, status]
  )

  if (!updated.rows.length) return null

  await query(
    `
      insert into dynamix_quote_events (
        quote_id,
        event_type,
        actor_type,
        actor_email,
        payload
      )
      values ($1,$2,'agent',$3,$4::jsonb)
    `,
    [
      quoteId,
      `quote_${status}`,
      session.agentEmail || null,
      JSON.stringify(payload),
    ]
  )

  return {
    id: updated.rows[0].id,
    status: updated.rows[0].status,
    updatedAt: updated.rows[0].updated_at,
    persisted: true,
  }
}
