import { NextResponse } from 'next/server'

import { getWeatherSummary } from '@/lib/dynamix-db'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const destination = searchParams.get('destination') || 'Bali'
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search')
    geocodeUrl.searchParams.set('name', destination)
    geocodeUrl.searchParams.set('count', '1')
    geocodeUrl.searchParams.set('language', 'en')
    geocodeUrl.searchParams.set('format', 'json')

    const geocodeResponse = await fetch(geocodeUrl.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!geocodeResponse.ok) {
      throw new Error(`Geocoding failed with ${geocodeResponse.status}`)
    }

    const geocodeData = await geocodeResponse.json()
    const location = geocodeData?.results?.[0]

    if (!location?.latitude || !location?.longitude) {
      throw new Error('Destination coordinates not found')
    }

    const today = new Date().toISOString().slice(0, 10)
    const forecastStart = startDate || today
    const forecastEnd = endDate || startDate || today

    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast')
    forecastUrl.searchParams.set('latitude', String(location.latitude))
    forecastUrl.searchParams.set('longitude', String(location.longitude))
    forecastUrl.searchParams.set('timezone', 'auto')
    forecastUrl.searchParams.set(
      'daily',
      'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode'
    )
    forecastUrl.searchParams.set('start_date', forecastStart)
    forecastUrl.searchParams.set('end_date', forecastEnd)

    const forecastResponse = await fetch(forecastUrl.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!forecastResponse.ok) {
      throw new Error(`Forecast failed with ${forecastResponse.status}`)
    }

    const forecastData = await forecastResponse.json()
    const daily = forecastData?.daily
    if (!daily?.time?.length) {
      throw new Error('No forecast data returned')
    }

    const maxTemps = daily.temperature_2m_max || []
    const minTemps = daily.temperature_2m_min || []
    const rainChances = daily.precipitation_probability_max || []

    const highestMax = Math.round(Math.max(...maxTemps))
    const lowestMin = Math.round(Math.min(...minTemps))
    const averageRainChance = Math.round(
      rainChances.reduce((sum, value) => sum + value, 0) / (rainChances.length || 1)
    )

    let rainLabel = 'low rain risk'
    let salesHint = 'Strong fit for outdoor sightseeing and easy sell-through.'

    if (averageRainChance >= 60) {
      rainLabel = 'higher rain risk'
      salesHint = 'Keep one flexible day and lead with indoor, spa, or city-safe alternatives.'
    } else if (averageRainChance >= 30) {
      rainLabel = 'possible showers'
      salesHint = 'Good for mixed plans. Hold one optional day and sell weather-safe add-ons with confidence.'
    } else if (highestMax >= 34) {
      salesHint = 'Lead with evening experiences, indoor comfort, and premium hotel positioning during warmer hours.'
    }

    return NextResponse.json({
      title: 'Weather for selected dates',
      summary: `${lowestMin}°-${highestMax}°C, ${rainLabel} in ${location.name}.`,
      salesHint,
      source: 'open-meteo',
      location: {
        name: location.name,
        country: location.country,
      },
      dateRange: {
        startDate: forecastStart,
        endDate: forecastEnd,
      },
    })
  } catch {
    return NextResponse.json(await getWeatherSummary(destination))
  }
}
