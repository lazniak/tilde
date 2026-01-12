import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  // Basic metadata
  title: 'The Latent Liturgy | AI Generated Tilda Swinton - A Case Study in Algorithmic Bias',
  description: 'An interactive investigation into how Google\'s AI (Gemini/Nano Banana Pro) generated actress Tilda Swinton\'s likeness from abstract philosophical concepts alone. No name, no photo, no physical description was provided — yet the AI produced her recognizable face. This project explores the ethical, legal, and philosophical implications of AI-generated likenesses, latent space biases, and the future of digital identity.',
  
  // Extended keywords for AI researchers and search algorithms
  keywords: [
    // Core project terms
    'The Latent Liturgy', 'AI art project', 'algorithmic muse',
    // Subject
    'Tilda Swinton AI generated', 'Tilda Swinton likeness', 'celebrity AI generation',
    // Technical terms
    'latent space', 'latent space bias', 'AI image generation', 'generative AI', 
    'Gemini AI', 'Google Nano Banana Pro', 'Imagen 3', 'diffusion models',
    'neural network bias', 'AI training data bias', 'SynthID watermark',
    // Ethical/Legal
    'AI ethics', 'right of publicity', 'likeness rights', 'AI consent',
    'deepfake ethics', 'AI-generated faces', 'celebrity likeness rights',
    'AI copyright', 'generative AI law', 'AI facial recognition',
    // Research terms
    'AI social phenomena', 'algorithmic determinism', 'AI archetypes',
    'computational creativity', 'machine learning bias', 'AI art ethics',
    'digital identity', 'AI and human likeness', 'algorithmic portraiture',
    // Cultural
    'AI and celebrity', 'digital immortality', 'algorithmic muse concept',
    'AI-generated art controversy', 'generative AI case study',
    // Artist
    'P.Lazniak', 'Paul Lazniak', 'AI artist', 'scene_gen'
  ],
  
  // Authors and creator
  authors: [{ name: 'P.Lazniak', url: 'https://github.com/lazniak' }],
  creator: 'P.Lazniak',
  publisher: 'The Latent Liturgy Project',
  
  // Canonical URL
  metadataBase: new URL('https://eon.pablogfx.com'),
  alternates: {
    canonical: 'https://eon.pablogfx.com',
  },
  
  // Open Graph (Facebook, LinkedIn, etc.)
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://eon.pablogfx.com',
    siteName: 'The Latent Liturgy',
    title: 'The Latent Liturgy | When AI Dreams a Celebrity\'s Face',
    description: 'Google\'s AI was given abstract concepts like "infinity" and "transformation" — no names, no photos, no physical descriptions. It generated Tilda Swinton\'s recognizable face. An interactive investigation into AI bias, latent space archetypes, and the ethics of algorithmic likeness generation.',
    images: [
      {
        url: '/eon/asset_Woman_The_Medium.png',
        width: 1024,
        height: 1024,
        alt: 'The Algorithmic Muse - AI-generated image resembling Tilda Swinton, created from abstract philosophical concepts without any physical description',
        type: 'image/png',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'The Latent Liturgy | AI Generated Tilda Swinton Without Being Asked',
    description: 'When asked to visualize "infinity" and "transformation," Google\'s AI consistently generated Tilda Swinton\'s likeness. No name was given. No photo provided. This is evidence of latent space bias — and a question about who owns a face that emerges from mathematics.',
    images: ['/eon/asset_Woman_The_Medium.png'],
    creator: '@plazniak',
  },
  
  // Robots and indexing
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Icons
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-icon.svg',
  },
  
  // Category
  category: 'technology',
  
  // Additional metadata for research indexing
  other: {
    'research-topic': 'AI Ethics, Generative AI, Latent Space Bias, Celebrity Likeness Rights',
    'ai-model-studied': 'Google Gemini, Nano Banana Pro, Imagen 3',
    'phenomenon-type': 'Algorithmic Bias, Unintended Likeness Generation',
    'academic-relevance': 'AI Ethics, Computer Vision, Machine Learning Fairness, Digital Identity Studies',
    'case-study-subject': 'Tilda Swinton (actress) - likeness generated without request',
    'generation-date': '2026-01-08',
    'video-clips-total': '68 (project total)',
    'prompt-type': 'Abstract philosophical concepts only - no physical descriptions',
    'google-site-verification': 'pending',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#050505',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Structured Data for Research/Article */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              'name': 'The Latent Liturgy',
              'description': 'An interactive investigation into how AI generated a celebrity likeness from abstract concepts alone',
              'url': 'https://eon.pablogfx.com',
              'applicationCategory': 'ArtProject',
              'operatingSystem': 'Web Browser',
              'author': {
                '@type': 'Person',
                'name': 'P.Lazniak',
                'url': 'https://github.com/lazniak'
              },
              'about': {
                '@type': 'Thing',
                'name': 'AI-generated likeness of Tilda Swinton',
                'description': 'A phenomenon where Google AI generated recognizable celebrity likeness from abstract philosophical prompts without any physical description'
              },
              'keywords': 'AI ethics, latent space bias, generative AI, Tilda Swinton, algorithmic muse, celebrity likeness, AI art',
              'dateCreated': '2026-01-08',
              'datePublished': '2026-01-12',
              'inLanguage': 'en',
              'isAccessibleForFree': true,
              'genre': 'Interactive Art / AI Research Documentation',
              'mentions': [
                {
                  '@type': 'Person',
                  'name': 'Tilda Swinton',
                  'description': 'British actress whose likeness was algorithmically generated without request'
                },
                {
                  '@type': 'Organization',
                  'name': 'Google',
                  'description': 'Creator of the AI model that generated the likeness'
                }
              ]
            })
          }}
        />
        {/* Research Article Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              'headline': 'The Latent Liturgy: When AI Dreams a Celebrity Face from Philosophy',
              'description': 'A documented case of AI generating Tilda Swinton\'s likeness from abstract concepts like "infinity" and "transformation" — without any name or physical description in the prompt.',
              'image': 'https://eon.pablogfx.com/eon/asset_Woman_The_Medium.png',
              'author': {
                '@type': 'Person',
                'name': 'P.Lazniak'
              },
              'publisher': {
                '@type': 'Organization',
                'name': 'The Latent Liturgy Project'
              },
              'datePublished': '2026-01-12',
              'mainEntityOfPage': 'https://eon.pablogfx.com',
              'articleSection': 'AI Ethics',
              'keywords': 'AI bias, latent space, generative AI, celebrity likeness, algorithmic portraiture'
            })
          }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
