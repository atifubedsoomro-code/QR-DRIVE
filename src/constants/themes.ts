import { CoverTheme } from '../types';

export const COVER_THEMES: CoverTheme[] = [
  {
    id: 'executive-horizon',
    name: 'Executive Horizon',
    description: 'Corporate navy with architectural framing, bold title typography and structured metadata.',
    category: 'Corporate',
    primaryColor: '#0f172a', // Slate 900
    secondaryColor: '#1e293b', // Slate 800
    accentColor: '#3b82f6', // Blue 500
    textColor: '#0f172a',
    backgroundColor: '#ffffff',
    defaultFont: 'inter',
    defaultImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    layoutStyle: 'banner-top',
  },
  {
    id: 'clean-scandinavian',
    name: 'Nordic Minimalist',
    description: 'Pure aesthetic with refined serif typography, fine lines, and generous balanced whitespace.',
    category: 'Minimalist',
    primaryColor: '#18181b', // Zinc 900
    secondaryColor: '#71717a', // Zinc 500
    accentColor: '#52525b', // Zinc 600
    textColor: '#18181b',
    backgroundColor: '#fafafa',
    defaultFont: 'playfair',
    defaultImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    layoutStyle: 'minimal-frame',
  },
  {
    id: 'cyber-slate',
    name: 'Cyber Slate',
    description: 'High-contrast dark mode with neon cyan highlights, technical typography, and modern precision.',
    category: 'Modern',
    primaryColor: '#090d16',
    secondaryColor: '#111827',
    accentColor: '#06b6d4', // Cyan 500
    textColor: '#f8fafc',
    backgroundColor: '#090d16',
    defaultFont: 'mono',
    defaultImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    layoutStyle: 'geometric-grid',
    isDark: true,
  },
  {
    id: 'creative-spectrum',
    name: 'Creative Spectrum',
    description: 'Vibrant modern gradient banner with bold contemporary font and expressive badge styling.',
    category: 'Creative',
    primaryColor: '#4f46e5', // Indigo 600
    secondaryColor: '#9333ea', // Purple 600
    accentColor: '#ec4899', // Pink 500
    textColor: '#1e1b4b',
    backgroundColor: '#ffffff',
    defaultFont: 'space',
    defaultImage: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
    layoutStyle: 'banner-top',
  },
  {
    id: 'academic-thesis',
    name: 'Academic & Research',
    description: 'Scholarly formal layout with classical crest framing, reference numbering, and institutional authority.',
    category: 'Academic',
    primaryColor: '#1e3a8a', // Blue 900
    secondaryColor: '#3b82f6',
    accentColor: '#b45309', // Amber 700
    textColor: '#172554',
    backgroundColor: '#fefefe',
    defaultFont: 'merriweather',
    defaultImage: 'https://images.unsplash.com/photo-1507842229451-7f01be7f7a26?auto=format&fit=crop&w=1200&q=80',
    layoutStyle: 'bordered-formal',
  },
  {
    id: 'editorial-vanguard',
    name: 'Editorial Vanguard',
    description: 'High-fashion editorial split column with oversized typography and photography block.',
    category: 'Editorial',
    primaryColor: '#1c1917', // Stone 900
    secondaryColor: '#44403c', // Stone 700
    accentColor: '#ea580c', // Orange 600
    textColor: '#1c1917',
    backgroundColor: '#f5f5f4', // Stone 100
    defaultFont: 'playfair',
    defaultImage: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80',
    layoutStyle: 'split-vertical',
  },
  {
    id: 'botanical-eco',
    name: 'Botanical & Sustainable',
    description: 'Natural organic forest green palette with clean environmental feel and leaf accents.',
    category: 'Modern',
    primaryColor: '#14532d', // Green 900
    secondaryColor: '#166534', // Green 800
    accentColor: '#15803d', // Green 700
    textColor: '#052e16',
    backgroundColor: '#f0fdf4', // Green 50
    defaultFont: 'inter',
    defaultImage: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
    layoutStyle: 'banner-top',
  },
  {
    id: 'legal-governance',
    name: 'Legal & Compliance',
    description: 'Formal double-ruled legal frame with case docket layout, strict hierarchy, and certification seals.',
    category: 'Corporate',
    primaryColor: '#111827', // Gray 900
    secondaryColor: '#374151',
    accentColor: '#991b1b', // Red 800
    textColor: '#111827',
    backgroundColor: '#ffffff',
    defaultFont: 'merriweather',
    defaultImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
    layoutStyle: 'bordered-formal',
  },
  {
    id: 'startup-pitch',
    name: 'Venture Pitch Deck',
    description: 'Dynamic tech startup presentation cover with energetic violet accents and metric cards.',
    category: 'Modern',
    primaryColor: '#581c87', // Purple 900
    secondaryColor: '#7e22ce',
    accentColor: '#a855f7', // Purple 500
    textColor: '#2e1065',
    backgroundColor: '#faf5ff', // Purple 50
    defaultFont: 'space',
    defaultImage: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80',
    layoutStyle: 'card-centered',
  },
  {
    id: 'imperial-gold',
    name: 'Imperial Obsidian & Gold',
    description: 'Ultra-luxury obsidian backdrop with metallic warm gold borders, perfect for premium reports.',
    category: 'Luxury',
    primaryColor: '#0a0a0a',
    secondaryColor: '#171717',
    accentColor: '#d97706', // Amber 600
    textColor: '#fef3c7', // Amber 100
    backgroundColor: '#0f0f10',
    defaultFont: 'playfair',
    defaultImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    layoutStyle: 'minimal-frame',
    isDark: true,
  },
  {
    id: 'swiss-grid',
    name: 'Swiss International',
    description: 'Iconic modernism with red accent bars, strict typographic grid, and bold contrast.',
    category: 'Creative',
    primaryColor: '#dc2626', // Red 600
    secondaryColor: '#18181b', // Zinc 900
    accentColor: '#ef4444', // Red 500
    textColor: '#18181b',
    backgroundColor: '#ffffff',
    defaultFont: 'inter',
    defaultImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    layoutStyle: 'geometric-grid',
  },
  {
    id: 'warm-terracotta',
    name: 'Artisan Terracotta',
    description: 'Warm earth, toasted clay, and sand palette with handcrafted warmth and tactile beauty.',
    category: 'Creative',
    primaryColor: '#7c2d12', // Orange 900
    secondaryColor: '#9a3412',
    accentColor: '#c2410c', // Orange 700
    textColor: '#431407',
    backgroundColor: '#fff7ed', // Orange 50
    defaultFont: 'playfair',
    defaultImage: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    layoutStyle: 'bottom-accent',
  },

  // ─── PLAIN COVER PAGES: no pictures, just type, rules and the QR code ───
  {
    id: 'plain-white',
    name: 'Plain White',
    description: 'Pure white page with clean black type. Nothing but the title, details and QR code.',
    category: 'Plain',
    primaryColor: '#111827',
    secondaryColor: '#4b5563',
    accentColor: '#374151',
    textColor: '#1f2937',
    backgroundColor: '#ffffff',
    defaultFont: 'inter',
    defaultImage: '',
    layoutStyle: 'plain',
  },
  {
    id: 'plain-classic-rule',
    name: 'Classic Ruled',
    description: 'Serif title between a heavy top rule and a fine bottom rule. Formal and print friendly.',
    category: 'Plain',
    primaryColor: '#1c1917',
    secondaryColor: '#57534e',
    accentColor: '#78716c',
    textColor: '#292524',
    backgroundColor: '#ffffff',
    defaultFont: 'playfair',
    defaultImage: '',
    layoutStyle: 'plain-rule',
  },
  {
    id: 'plain-side-bar',
    name: 'Side Bar',
    description: 'Solid colour bar down the left edge with left aligned type. No images.',
    category: 'Plain',
    primaryColor: '#1e3a8a',
    secondaryColor: '#3b82f6',
    accentColor: '#3b82f6',
    textColor: '#1e293b',
    backgroundColor: '#ffffff',
    defaultFont: 'inter',
    defaultImage: '',
    layoutStyle: 'plain-left-bar',
  },
  {
    id: 'plain-centered',
    name: 'Centered Title',
    description: 'Title block centered on the page like a book cover, with a small accent divider.',
    category: 'Plain',
    primaryColor: '#0f172a',
    secondaryColor: '#334155',
    accentColor: '#0f766e',
    textColor: '#334155',
    backgroundColor: '#ffffff',
    defaultFont: 'merriweather',
    defaultImage: '',
    layoutStyle: 'plain-centered',
  },
  {
    id: 'plain-cream',
    name: 'Cream Paper',
    description: 'Warm cream paper with brown ink and fine rules. Soft, no pictures.',
    category: 'Plain',
    primaryColor: '#422006',
    secondaryColor: '#78350f',
    accentColor: '#a16207',
    textColor: '#451a03',
    backgroundColor: '#fdf8ee',
    defaultFont: 'playfair',
    defaultImage: '',
    layoutStyle: 'plain-rule',
  },
  {
    id: 'plain-ink',
    name: 'Plain Ink (Dark)',
    description: 'Solid near-black page with white type and a yellow accent. No pictures.',
    category: 'Plain',
    primaryColor: '#ffffff',
    secondaryColor: '#a1a1aa',
    accentColor: '#facc15',
    textColor: '#e4e4e7',
    backgroundColor: '#0b0b0d',
    defaultFont: 'space',
    defaultImage: '',
    layoutStyle: 'plain',
    isDark: true,
  },
];

export const PRESET_IMAGES = [
  {
    id: 'arch-1',
    name: 'Modern Architecture',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    category: 'Corporate',
  },
  {
    id: 'arch-2',
    name: 'Glass Skyscraper',
    url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1200&q=80',
    category: 'Corporate',
  },
  {
    id: 'minimal-1',
    name: 'Minimalist Interior',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    category: 'Minimalist',
  },
  {
    id: 'tech-1',
    name: 'Digital Cyber Mesh',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    category: 'Technology',
  },
  {
    id: 'tech-2',
    name: 'Server & Connectivity',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    category: 'Technology',
  },
  {
    id: 'creative-1',
    name: 'Liquid Abstract Flow',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
    category: 'Creative',
  },
  {
    id: 'library-1',
    name: 'Classical Library',
    url: 'https://images.unsplash.com/photo-1507842229451-7f01be7f7a26?auto=format&fit=crop&w=1200&q=80',
    category: 'Academic',
  },
  {
    id: 'nature-1',
    name: 'Misty Evergreen Forest',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
    category: 'Nature',
  },
  {
    id: 'legal-1',
    name: 'Law & Governance',
    url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
    category: 'Legal',
  },
  {
    id: 'startup-1',
    name: 'Collaborative Workspace',
    url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80',
    category: 'Modern',
  },
  {
    id: 'luxury-1',
    name: 'Marble & Architectural Gold',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    category: 'Luxury',
  },
  {
    id: 'abstract-geo',
    name: 'Bauhaus Geometrics',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    category: 'Creative',
  },
];
