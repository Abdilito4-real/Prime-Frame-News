export type ArticleStatus = 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  category: string;
  categorySlug: string;
  author: string;
  authorSlug: string;
  excerpt: string;
  image: string;
  body: string[];
  tags: string[];
  readTime: number;
  views: number;
  publishedAt: string;
  updatedAt: string;
  status: ArticleStatus;
  featured: boolean;
  trending: boolean;
  editorPick: boolean;
  breaking: boolean;
  commentsEnabled: boolean;
}

export const categories: Category[] = [
  {
    id: 'politics',
    name: 'Politics',
    slug: 'politics',
    description: 'Government, public policy, elections, legislation, governance, and international political developments.',
  },
  {
    id: 'business',
    name: 'Business',
    slug: 'business',
    description: 'Markets, entrepreneurship, finance, industry, companies, and economic developments.',
  },
  {
    id: 'technology',
    name: 'Technology',
    slug: 'technology',
    description: 'Artificial intelligence, software, cybersecurity, digital innovation, startups, and emerging technologies.',
  },
  {
    id: 'education',
    name: 'Education',
    slug: 'education',
    description: 'Schools, universities, examinations, admissions, scholarships, policy, and learning developments.',
  },
  {
    id: 'opinion',
    name: 'Opinion',
    slug: 'opinion',
    description: 'Editorials, columns, commentary, perspectives, and signed opinion pieces.',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    slug: 'editorial',
    description: 'Editorial coverage, newsroom analysis, and perspectives on the issues shaping the day.',
  },
];

export const seedArticles: Article[] = [
  {
    id: 'art-1',
    title: 'Cabinet approves a new digital public service overhaul',
    slug: 'cabinet-approves-new-digital-public-service-overhaul',
    subtitle: 'The plan will modernize service delivery, citizen records, and rural digital access across the country.',
    category: 'Politics',
    categorySlug: 'politics',
    author: 'Amina Yusuf',
    authorSlug: 'amina-yusuf',
    excerpt: 'Government officials say the investment will cut processing delays and improve transparency in public-facing services.',
    image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80',
    body: [
      'The cabinet has approved a sweeping digital public service overhaul designed to streamline citizen services, reduce administrative bottlenecks, and improve trust in public institutions. Ministers say the project will unify service access across health, education, transport, and licensing agencies.',
      'Officials said the reforms would introduce a single digital identity layer and modern case-management systems. The goal, they argued, is not just convenience but better accountability, especially in rural and underserved communities where paper-based systems have historically slowed service delivery.',
      'Critics, however, warned that the new platform must be backed by strong cybersecurity protections and clear safeguards for data privacy. Analysts also pointed to the importance of staffing, training, and public outreach to avoid a technology rollout that creates new exclusions.',
      'The government did not provide full cost figures, but said procurement and rollout would begin in the next quarter, with a phased launch planned across major agencies.'
    ],
    tags: ['government', 'innovation', 'public services'],
    readTime: 5,
    views: 4362,
    publishedAt: '2026-10-14T08:30:00.000Z',
    updatedAt: '2026-10-14T10:15:00.000Z',
    status: 'published',
    featured: true,
    trending: true,
    editorPick: true,
    breaking: true,
    commentsEnabled: true,
  },
  {
    id: 'art-2',
    title: 'Energy exports rebound as global demand stabilizes',
    slug: 'energy-exports-rebound-as-global-demand-stabilizes',
    subtitle: 'Analysts expect production expansion to support jobs and infrastructure spending in the near term.',
    category: 'Business',
    categorySlug: 'business',
    author: 'Kehinde Bello',
    authorSlug: 'kehinde-bello',
    excerpt: 'A pickup in industrial demand has boosted export confidence, lifting the outlook for ports, logistics, and upstream investments.',
    image: 'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?auto=format&fit=crop&w=1200&q=80',
    body: [
      'Trade data released this week shows a steady improvement in energy exports as manufacturing activity rises in several major markets. Industry leaders say shipping volumes, plant utilization, and foreign demand have all improved after a prolonged period of uncertainty.',
      'The rebound has pleased investors, who are now looking at further capital commitments in logistics, refining, and distribution infrastructure. Analysts say producers are also benefiting from more predictable pricing and lower freight volatility.',
      'Still, the pace of recovery remains uneven. While export numbers have improved, energy executives warn that subsidies, currency volatility, and infrastructure bottlenecks could limit how quickly gains translate into broader economic growth.'
    ],
    tags: ['economy', 'trade', 'energy'],
    readTime: 4,
    views: 3190,
    publishedAt: '2026-10-13T12:00:00.000Z',
    updatedAt: '2026-10-13T12:50:00.000Z',
    status: 'published',
    featured: false,
    trending: true,
    editorPick: false,
    breaking: false,
    commentsEnabled: true,
  },
  {
    id: 'art-3',
    title: 'Startups race to build AI tutoring tools for local classrooms',
    slug: 'startups-race-to-build-ai-tutoring-tools-for-local-classrooms',
    subtitle: 'Education technology firms are testing adaptive assistants that personalize learning without replacing teachers.',
    category: 'Technology',
    categorySlug: 'technology',
    author: 'Tariq Sani',
    authorSlug: 'tariq-sani',
    excerpt: 'New tools tailor lesson pacing, flag struggling students, and help teachers prepare more targeted classroom interventions.',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    body: [
      'The first wave of AI tutoring products is beginning to reach schools, promising to personalize learning at scale. Rather than replacing teachers, many vendors say their products are designed to free educators from repetitive tasks and help them spot students who need individual attention sooner.',
      'Pilot programs in several districts show measurable improvements in reading fluency and problem-solving habits. Teachers say the software is especially useful for homework support and revision planning, but they also stress that human oversight remains vital.',
      'Education experts have called for strong policies around data protection, algorithmic transparency, and student consent. As the sector evolves, the immediate challenge is balancing innovation with equity and accessibility.'
    ],
    tags: ['ai', 'education', 'startups'],
    readTime: 6,
    views: 2924,
    publishedAt: '2026-10-12T09:15:00.000Z',
    updatedAt: '2026-10-12T09:40:00.000Z',
    status: 'published',
    featured: false,
    trending: true,
    editorPick: true,
    breaking: false,
    commentsEnabled: false,
  },
  {
    id: 'art-4',
    title: 'Urban clinics expand community health screenings after record turnout',
    slug: 'urban-clinics-expand-community-health-screenings-after-record-turnout',
    subtitle: 'Public health teams are making screenings more accessible and preventive as demand for routine care remains high.',
    category: 'Editorial',
    categorySlug: 'editorial',
    author: 'Binta Okafor',
    authorSlug: 'binta-okafor',
    excerpt: 'Medical outreach programs reported their strongest turnout in two years, prompting plans for expanded mobile clinics and digital follow-ups.',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
    body: [
      'Community health workers reported a record number of residents attending preventive screenings over the last month, prompting administrators to expand weekend and mobile clinic services. Public health experts said the rise in attendance signals growing awareness but also highlights persistent gaps in routine primary care access.',
      'The expanded service model includes blood pressure checks, glucose screening, vaccination guidance, and referrals for mental health support. Leaders argue that earlier intervention can prevent more expensive emergency care later on.',
      'Officials also emphasized the need for long-term investment in staffing, patient follow-up, and digital outreach to sustain participation beyond one-time campaigns.'
    ],
    tags: ['healthcare', 'community', 'prevention'],
    readTime: 5,
    views: 2487,
    publishedAt: '2026-10-11T15:00:00.000Z',
    updatedAt: '2026-10-11T15:40:00.000Z',
    status: 'published',
    featured: false,
    trending: false,
    editorPick: false,
    breaking: false,
    commentsEnabled: true,
  },
  {
    id: 'art-5',
    title: 'Championship race tightens as late-season form reshapes title hopes',
    slug: 'championship-race-tightens-as-late-season-form-reshapes-title-hopes',
    subtitle: 'Teams are recalibrating tactics after a string of unpredictable results.',
    category: 'Sports',
    categorySlug: 'sports',
    author: 'Marcus Folarin',
    authorSlug: 'marcus-folarin',
    excerpt: 'The season’s final stretch has thrown the table into uncertainty, with rival clubs changing strategy and squad selection alike.',
    image: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80',
    body: [
      'A dramatic run of results has reset the title picture across the league, with teams now viewing each remaining fixture as a decisive moment. Managers say the unpredictability is forcing more aggressive tactical planning and sharper squad rotation decisions.',
      'Analysts point to the increased physical demands, injuries, and a more compact schedule as the main drivers behind the volatility. Several clubs have also been forced to rethink their end-of-season priorities as European qualification and relegation battles sharpen.',
      'Supporters are hoping the closing stretch delivers the kind of high-stakes drama that defines the sport at its best.'
    ],
    tags: ['football', 'league', 'championship'],
    readTime: 4,
    views: 3210,
    publishedAt: '2026-10-10T18:00:00.000Z',
    updatedAt: '2026-10-10T18:25:00.000Z',
    status: 'published',
    featured: false,
    trending: true,
    editorPick: false,
    breaking: false,
    commentsEnabled: true,
  },
  {
    id: 'art-6',
    title: 'Film festival highlights a new generation of regional storytellers',
    slug: 'film-festival-highlights-new-generation-of-regional-storytellers',
    subtitle: 'Local directors are turning to intimate, issue-driven narratives that resonate beyond borderlines.',
    category: 'Technology',
    categorySlug: 'technology',
    author: 'Leila Essien',
    authorSlug: 'leila-essien',
    excerpt: 'Independent screens and community cinema programs are giving underrepresented voices a bigger platform across the region.',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    body: [
      'This year’s film festival has drawn attention to a vibrant cohort of regional filmmakers using intimate, character-driven stories to explore migration, identity, and everyday resilience. Organizers say the rise in submissions reflects a broad appetite for narratives grounded in local realities.',
      'Festival juries praised the confidence and craft of younger directors, particularly those blending documentary techniques with fiction to tell complex social stories. Several of the strongest entries are also being considered for wider international distribution.',
      'For audiences, the showcase is a reminder that regional cinema can deliver both cultural specificity and universal emotional power.'
    ],
    tags: ['film', 'culture', 'storytelling'],
    readTime: 5,
    views: 1890,
    publishedAt: '2026-10-09T11:45:00.000Z',
    updatedAt: '2026-10-09T12:15:00.000Z',
    status: 'published',
    featured: false,
    trending: false,
    editorPick: true,
    breaking: false,
    commentsEnabled: false,
  },
  {
    id: 'art-7',
    title: 'Why local newsrooms need stronger trust-building strategies in digital spaces',
    slug: 'why-local-newsrooms-need-stronger-trust-building-strategies-in-digital-spaces',
    subtitle: 'Editors say transparency and accountable reporting are the fastest routes to audience loyalty.',
    category: 'Opinion',
    categorySlug: 'opinion',
    author: 'Chika Nwosu',
    authorSlug: 'chika-nwosu',
    excerpt: 'Public trust in journalism no longer comes from brand recognition alone. It is built through consistency, context, and clear editorial values.',
    image: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80',
    body: [
      'Digital audiences now expect more than timely reporting. They want context, accountability, and a clear understanding of how stories are sourced and verified. These expectations are reshaping how local newsrooms build trust in a crowded and often polarized media environment.',
      'The most credible publishers are doing a better job of explaining their editorial process, linking to source material, and engaging in transparent correction practices. Readers are not asking for perfection. They are asking for clarity and consistency.',
      'If journalism is to remain relevant, local outlets must turn transparency into a product feature rather than an afterthought.'
    ],
    tags: ['media', 'trust', 'editorial'],
    readTime: 4,
    views: 2570,
    publishedAt: '2026-10-08T14:20:00.000Z',
    updatedAt: '2026-10-08T14:35:00.000Z',
    status: 'published',
    featured: false,
    trending: false,
    editorPick: true,
    breaking: false,
    commentsEnabled: true,
  },
  {
    id: 'art-8',
    title: 'Schools expand digital libraries after funding boost',
    slug: 'schools-expand-digital-libraries-after-funding-boost',
    subtitle: 'Districts hope renewed access will improve literacy and keep students engaged during school breaks.',
    category: 'Education',
    categorySlug: 'education',
    author: 'Ruth Adebayo',
    authorSlug: 'ruth-adebayo',
    excerpt: 'A new round of investment is helping schools build accessible reading platforms, research databases, and e-learning hubs.',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80',
    body: [
      'Education officials say a funding increase will allow schools to expand digital libraries and improve access to reading materials across elementary and secondary institutions. The initiative is expected to help students continue learning between terms and outside classroom hours.',
      'Several districts are also introducing curated reading lists and teacher-led discovery tools to make digital library use more purposeful. Officials argue that technology works best when paired with strong literacy instruction.',
      'Education advocates remain cautious, however, noting that connectivity and device access still vary dramatically across communities.'
    ],
    tags: ['literacy', 'schools', 'digital learning'],
    readTime: 5,
    views: 2104,
    publishedAt: '2026-10-06T10:30:00.000Z',
    updatedAt: '2026-10-06T11:05:00.000Z',
    status: 'published',
    featured: false,
    trending: false,
    editorPick: false,
    breaking: false,
    commentsEnabled: false,
  },
  {
    id: 'art-9',
    title: 'Draft: city planners propose green transport corridor',
    slug: 'city-planners-propose-green-transport-corridor',
    subtitle: 'The draft policy would prioritize bike lanes, bus priority, and cleaner air.',
    category: 'Politics',
    categorySlug: 'politics',
    author: 'Amina Yusuf',
    authorSlug: 'amina-yusuf',
    excerpt: 'The proposal would link neighbourhoods with safer, lower-emission mobility routes designed for daily commuters.',
    image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    body: [
      'City planners have put forward a proposed green transport corridor designed to improve local mobility and reduce emissions in high-density areas. The initial concept includes bus priority lanes, safer cycling routes, and new pedestrian crossings.',
      'The plan is still in draft form, and consultation is ongoing with residents, transport operators, and businesses. Officials said the route is intended to reduce congestion while improving access to jobs, schools, and markets.',
      'Supporters of the scheme say it could improve public health and reduce transport costs for working families. Critics are pushing for clearer funding commitments before implementation begins.'
    ],
    tags: ['transport', 'mobility', 'draft'],
    readTime: 5,
    views: 1120,
    publishedAt: '2026-10-15T07:35:00.000Z',
    updatedAt: '2026-10-15T09:00:00.000Z',
    status: 'draft',
    featured: false,
    trending: false,
    editorPick: false,
    breaking: false,
    commentsEnabled: true,
  },
  {
    id: 'art-10',
    title: 'Scheduled: infrastructure briefing to launch on Thursday',
    slug: 'scheduled-infrastructure-briefing-to-launch-on-thursday',
    subtitle: 'Editors are scheduling a live briefing around road, rail, and digital network investments.',
    category: 'Business',
    categorySlug: 'business',
    author: 'Kehinde Bello',
    authorSlug: 'kehinde-bello',
    excerpt: 'The upcoming briefing will pull together financing, delivery timelines, and projected impact across key sectors.',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
    body: [
      'Organizers say the briefing will provide a deeper look at how infrastructure investment is being prioritized, especially in transport, utilities, and connectivity. The editorial package will include interviews, maps, and policy analysis.',
      'The event is scheduled to go live at the end of the week, with a follow-up report expected to be published within 24 hours. Journalists say the piece is intended to make complex investment timelines easier to understand for readers.'
    ],
    tags: ['infrastructure', 'briefing', 'economy'],
    readTime: 3,
    views: 890,
    publishedAt: '2026-10-20T09:00:00.000Z',
    updatedAt: '2026-10-18T12:00:00.000Z',
    status: 'scheduled',
    featured: false,
    trending: false,
    editorPick: false,
    breaking: false,
    commentsEnabled: false,
  },
];

export const defaultSiteConfig = {
  brand: 'PrimeFrame',
  shortTagline: 'Stories that matter',
  email: 'hello@primeflowdigitalflows.com',
  phone: '+1 (555) 118-2405',
  city: 'Lagos',
  country: 'Nigeria',
};

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
