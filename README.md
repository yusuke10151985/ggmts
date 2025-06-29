# Multilingual Translator & Summarizer

A production-grade Next.js application for translating and summarizing text in multiple languages using AI-powered services like Google Gemini and OpenAI GPT.

## Features

- 🌍 **Multilingual Translation**: Support for 20+ languages with auto-detection
- 📝 **Text Summarization**: AI-powered summarization with numbered lists
- 🎨 **Modern UI**: Built with TailwindCSS and shadcn/ui components
- 🌙 **Dark Mode**: Seamless theme switching with next-themes
- 📱 **Responsive Design**: Optimized for desktop and mobile devices
- 📋 **Translation History**: Local storage-based history with copy functionality
- ⚡ **Fast Performance**: Built with Next.js 14 App Router
- 🎭 **Smooth Animations**: Framer Motion integration for delightful UX
- 📊 **Ad-Ready**: Prepared ad slots for future monetization

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **Theme**: next-themes
- **Icons**: Lucide React
- **AI Services**: Google Gemini, OpenAI GPT

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- API keys for Gemini and/or GPT

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ggmts-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` and add your API keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── translate/     # Translation API endpoint
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── privacy-policy/    # Privacy policy page
│   └── terms/             # Terms of service page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── ad-banner.tsx     # Ad placeholder component
│   ├── theme-toggle.tsx  # Theme switcher
│   └── translator-app.tsx # Main app component
├── lib/                  # Utility libraries
│   ├── constants.ts      # Language constants
│   ├── hooks/           # Custom hooks
│   ├── services/        # API services
│   ├── types.ts         # TypeScript types
│   └── utils.ts         # Utility functions
└── public/              # Static assets
```

## API Routes

### POST /api/translate

Translates text using the specified AI provider.

**Request Body:**
```json
{
  "text": "Hello world",
  "sourceLang": "auto",
  "targetLangs": ["es", "fr", "de"],
  "mode": "translate",
  "apiProvider": "gemini"
}
```

**Response:**
```json
{
  "sourceLanguage": "en",
  "translations": [
    {
      "lang": "es",
      "text": "Hola mundo"
    },
    {
      "lang": "fr", 
      "text": "Bonjour le monde"
    }
  ]
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes (for Gemini) |
| `OPENAI_API_KEY` | OpenAI API key | Yes (for GPT) |
| `NEXTAUTH_SECRET` | NextAuth secret | No |
| `NEXTAUTH_URL` | NextAuth URL | No |

## Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Add environment variables in Vercel dashboard
   - Deploy automatically on push

3. **Environment Variables in Vercel**
   - Go to your project settings
   - Add the same environment variables from `.env.local`

### Other Platforms

The app can be deployed to any platform that supports Next.js:

- **Netlify**: Use `next build && next export`
- **Railway**: Direct deployment from GitHub
- **DigitalOcean App Platform**: Container deployment
- **AWS Amplify**: Full-stack deployment

## Customization

### Adding New Languages

Edit `lib/constants.ts` to add new languages:

```typescript
const allLanguages: Language[] = [
  // ... existing languages
  { code: 'xx', name: '🇺🇳 New Language (Native Name)' },
]
```

### Adding New AI Providers

1. Create a new service in `lib/services/`
2. Add the provider to the API route in `app/api/translate/route.ts`
3. Update the UI to include the new provider option

### Styling

The app uses TailwindCSS with a custom design system. Colors and spacing can be customized in:

- `tailwind.config.js` - Tailwind configuration
- `app/globals.css` - CSS variables for theming

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@example.com or create an issue in the repository.

## Roadmap

- [ ] Add more AI providers (DeepL, Google Translate)
- [ ] Implement user accounts and cloud sync
- [ ] Add document upload support
- [ ] Create mobile app
- [ ] Add analytics and monitoring
- [ ] Implement rate limiting
- [ ] Add translation memory
- [ ] Support for more file formats
