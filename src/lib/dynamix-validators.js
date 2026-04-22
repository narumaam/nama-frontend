function isValidDate(value) {
  return !Number.isNaN(Date.parse(value))
}

export function validateTripQuery(query = {}) {
  if (!query.destination || !query.duration || !query.pax || !query.packageType || !query.travelerType) {
    return 'Trip definition is incomplete.'
  }

  if (query.startDate && !isValidDate(query.startDate)) {
    return 'Start date is invalid.'
  }

  if (query.endDate && !isValidDate(query.endDate)) {
    return 'End date is invalid.'
  }

  if (query.startDate && query.endDate && new Date(query.startDate) > new Date(query.endDate)) {
    return 'End date must be after start date.'
  }

  return null
}

export function validateQuoteDetails(quote = {}) {
  const email = quote.customerEmail?.trim()
  const whatsapp = quote.customerWhatsapp?.trim()
  const selectedChannels = Array.isArray(quote.selectedChannels) ? quote.selectedChannels : []

  if (!selectedChannels.length) {
    return 'Choose at least one delivery channel before sending the quote.'
  }

  if (selectedChannels.includes('email') && !email) {
    return 'Add a customer email to send this quote by email.'
  }

  if (selectedChannels.includes('whatsapp') && !whatsapp) {
    return 'Add a customer WhatsApp number to send this quote by WhatsApp.'
  }

  if (!email && !whatsapp) {
    return 'Add an email or WhatsApp number before sending the quote.'
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Customer email is invalid.'
  }

  if (whatsapp && !/^[+]?[0-9 ()-]{8,20}$/.test(whatsapp)) {
    return 'Customer WhatsApp number is invalid.'
  }

  return null
}
