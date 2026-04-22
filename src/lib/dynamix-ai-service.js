import { aiBlueprint, aiComposer, categoryOptions, getAiPlaybook } from '@/lib/dynamix-ai-data'

function buildFallbackPayload(kind, categorySlug) {
  const category = categoryOptions.find((item) => item.slug === categorySlug) || categoryOptions[0]
  const playbook = getAiPlaybook(category.slug)

  if (kind === 'blueprint') {
    return {
      primaryCategory: category.title,
      idealDestination: aiBlueprint.idealDestination,
      confidence: aiBlueprint.confidence,
      reasons: aiBlueprint.reasons,
      commercialSignals: aiBlueprint.commercialSignals,
    }
  }

  return {
    itineraryMode: aiComposer.itineraryMode,
    modules: aiComposer.modules,
    pricingAdvice: playbook.pricingAdvice,
    salesNarrative: aiComposer.salesNarrative,
    sendMessage: playbook.sendMessage,
  }
}

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'dynamix_ai_payload',
          schema: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    }),
  })

  if (!response.ok) return null

  const data = await response.json()
  const outputText = data.output?.[0]?.content?.[0]?.text
  if (!outputText) return null

  try {
    return JSON.parse(outputText)
  } catch {
    return null
  }
}

export async function getAiFlowPayload({ kind = 'blueprint', categorySlug = 'reset-retreat', destination = 'Bali' }) {
  const fallback = buildFallbackPayload(kind, categorySlug)
  const category = categoryOptions.find((item) => item.slug === categorySlug) || categoryOptions[0]

  const prompt = [
    'You are NAMA DYNAMIX, a commercial travel AI for agents.',
    'Return only JSON.',
    `Kind: ${kind}.`,
    `Category: ${category.title}.`,
    `Destination: ${destination}.`,
    `Use this fallback shape as guidance: ${JSON.stringify(fallback)}`,
    'Keep the output practical, category-first, and margin-aware.',
  ].join(' ')

  const live = await callOpenAI(prompt)
  return live || fallback
}
