# Vercel Production Deployment Checklist

## Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (if needed for server-side operations)
- [ ] Any other environment-specific variables

## Security & Configuration
- [ ] Middleware protection active for protected routes (/dashboard, /companies, /contacts, /reminders, /mass-email, /timeline, /settings)
- [ ] Row Level Security (RLS) enabled on companies and contacts tables
- [ ] User policies created for data access control

## Build Settings
- [ ] Build Command: `next build`
- [ ] Output Directory: `.next`
- [ ] Root Directory: `/`
- [ ] Environment: Node.js 20.x or higher

## Deployment
- [ ] Connected to GitHub repository
- [ ] Automatic redeploy enabled for every push to main branch
- [ ] Preview deployments disabled for production
- [ ] Domain configured (e.g., aquadock-crm.vercel.app)

## Custom Domain Setup (Optional)
1. Go to Vercel dashboard > Project Settings > Domains
2. Add your custom domain (e.g., crm.yourcompany.com)
3. Update DNS records as instructed:
   - CNAME record pointing to cname.vercel-dns.com
   - Or A records for apex domain
4. Wait for SSL certificate provisioning (automatic)
5. Test the domain in production

## Post-Deployment Verification
- [ ] Login functionality works
- [ ] Protected routes redirect to login when not authenticated
- [ ] Data fetching works correctly
- [ ] Dark mode toggles properly
- [ ] Mobile responsiveness on all pages
- [ ] Email templates and mass email features functional
- [ ] CSV import works with proper permissions

## Monitoring & Maintenance
- [ ] Enable Vercel Analytics for performance monitoring
- [ ] Set up error tracking (e.g., Sentry) if needed
- [ ] Configure backup strategies for Supabase data
- [ ] Regular security updates for dependencies

## Troubleshooting
- Check Vercel build logs for any build failures
- Verify environment variables are set correctly
- Ensure Supabase project is accessible from Vercel
- Test all features in production environment
- Monitor for any CORS or authentication issues
