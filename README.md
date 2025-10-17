# Troika Tech CRM

A production-grade two-role CRM system built with Next.js 14, TypeScript, Prisma, and NextAuth for Troika Tech.

## Features

- **Two-role system**: Admin and User roles with different permissions
- **Lead Management**: Create, view, search, and manage leads
- **Authentication**: Secure login/register with NextAuth
- **Admin Dashboard**: View all leads from all users
- **User Dashboard**: View only your own leads
- **Real-time Stats**: Lead counts and performance metrics
- **Search & Pagination**: Advanced filtering and pagination
- **Rate Limiting**: Built-in protection against spam
- **Responsive UI**: Clean, modern interface with shadcn/ui

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB (production) / SQLite (development)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **UI**: Tailwind CSS + shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd crm-app
npm install
```

### 2. Environment Setup

```bash
# Copy environment file
cp env.example .env

# Edit .env and set your values
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
DATABASE_URL="mongodb+srv://your-username:your-password@cluster.mongodb.net/crm_database?retryWrites=true&w=majority"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run postinstall

# Push database schema
npm run db:push

# Seed with sample data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Default Credentials

After seeding, you can login with:

**Admin Account:**
- Email: `admin@crm.local`
- Password: `Admin@123`

**Test User Accounts:**
- Email: `user1@test.com` / Password: `password123`
- Email: `user2@test.com` / Password: `password123`

## Project Structure

```
app/
├── api/                    # API routes
│   ├── auth/              # Authentication endpoints
│   └── leads/             # Lead management endpoints
├── dashboard/             # User dashboard
├── admin/                 # Admin dashboard
├── login/                 # Login page
├── register/              # Registration page
└── layout.tsx             # Root layout

components/
├── ui/                    # shadcn/ui components
├── sidebar.tsx            # Navigation sidebar
├── lead-form-dialog.tsx   # Add lead modal
└── lead-table.tsx         # Leads table component

lib/
├── auth.ts                # NextAuth configuration
├── prisma.ts              # Prisma client
├── validators.ts          # Zod schemas
└── utils.ts               # Utility functions

prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Database seeding
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Leads
- `GET /api/leads` - Get leads (with pagination, search, filters)
- `POST /api/leads` - Create new lead
- `GET /api/leads/stats` - Get lead statistics

### Query Parameters

**GET /api/leads:**
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 10)
- `search` - Search term
- `sort` - Sort field and direction (e.g., `createdAt:desc`)
- `all` - Show all leads (admin only)
- `owner` - Filter by owner email
- `dateFrom` - Filter from date
- `dateTo` - Filter to date

## Features in Detail

### User Dashboard
- View personal leads only
- Add new leads via modal
- Search and filter leads
- Pagination support
- Real-time statistics

### Admin Dashboard
- View all leads from all users
- Advanced filtering options
- Performance metrics
- Top performer tracking

### Lead Management
- Required fields: Customer Name, Mobile, Email
- Mobile number validation (Indian format)
- Email validation
- Automatic phone normalization (+91 prefix)

### Security Features
- Password hashing with bcrypt
- Rate limiting (20 leads/minute per user)
- Role-based access control
- Session management with NextAuth

## Production Deployment

### Database Migration
The application is configured to use MongoDB by default. For local development with SQLite:

```bash
# Update .env
DATABASE_URL="file:./dev.db"

# Push schema
npx prisma db push
```

### Environment Variables
```env
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-production-secret"
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/crm_database?retryWrites=true&w=majority"
```

## Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:push      # Push schema to database
npm run db:seed      # Seed database with sample data
npm run db:studio    # Open Prisma Studio
```

## Customization

### Adding New Fields
1. Update Prisma schema in `prisma/schema.prisma`
2. Run `npm run db:push`
3. Update Zod validators in `lib/validators.ts`
4. Update UI components as needed

### Styling
- Uses Tailwind CSS with custom design system
- Components from shadcn/ui
- Customizable via CSS variables in `app/globals.css`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
