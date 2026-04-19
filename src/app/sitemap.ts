import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://getnama.app', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://getnama.app/pricing', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://getnama.app/byok-calculator', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://getnama.app/register', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://getnama.app/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://getnama.app/terms', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://getnama.app/privacy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
