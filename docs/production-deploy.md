# Production Deployment Guide

## Vercel Settings Checklist

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL (public)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key (public)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only, for admin operations)
- [ ] `NEXTAUTH_SECRET` - If using NextAuth (generate a secure random string)
- [ ] `NEXTAUTH_URL` - Production domain URL (e.g., https://yourapp.vercel.app)

### Build Configuration
- [ ] Build Command: `npm run build` or `yarn build`
- [ ] Output Directory: `.next` (default)
- [ ] Root Directory: `/` (default)
- [ ] Node.js Version: 20.x or higher
- [ ] Install Command: `npm install` or `yarn install`

### Deployment Settings
- [ ] Framework Preset: Next.js
- [ ] Build Settings: Automatic (Git integration)
- [ ] Preview Deployments: Enabled for feature branches
- [ ] Production Branch: `main` or `master`
- [ ] Custom Domain: Configured (see Domain Setup section)

## Supabase Configuration

### Row Level Security (RLS)
- [ ] RLS enabled on all tables (companies, contacts, reminders, timeline, email_templates, email_log)
- [ ] User policies created for data isolation
- [ ] Service role key used only for server-side operations
- [ ] No direct client access to sensitive operations

### Connection Pooling
- [ ] Supavisor enabled for connection pooling
- [ ] Connection string updated to use pooled connections
- [ ] Environment variables updated for pooled connections:
  - `DATABASE_URL` - Pooled connection string
  - `DIRECT_URL` - Direct connection string (for migrations)

### Database Settings
- [ ] Database size appropriate for expected load
- [ ] Point-in-time recovery enabled
- [ ] Database password rotated regularly
- [ ] Connection limits configured appropriately

## Security Checklist

### Client-Side Security
- [ ] No sensitive environment variables exposed to client
- [ ] All API calls use proper authentication
- [ ] Supabase keys are public keys (anon key)
- [ ] No service role keys in client code
- [ ] All user inputs sanitized and validated

### Server-Side Security
- [ ] Server actions use proper authentication
- [ ] Database queries use parameterized statements
- [ ] File uploads validated and stored securely
- [ ] Rate limiting implemented for API endpoints
- [ ] CORS configured appropriately

### Authentication & Authorization
- [ ] Supabase Auth configured with proper providers
- [ ] Password policies enforced
- [ ] Session management configured
- [ ] User roles and permissions implemented
- [ ] Admin access restricted

## Monitoring & Observability

### Vercel Analytics
- [ ] Vercel Analytics enabled
- [ ] Custom events tracked for user actions
- [ ] Performance metrics monitored
- [ ] Error tracking configured

### Supabase Monitoring
- [ ] Database performance monitored
- [ ] Query logs reviewed regularly
- [ ] API usage tracked
- [ ] Error logs monitored
- [ ] Real-time metrics enabled

### Application Monitoring
- [ ] Error boundaries implemented
- [ ] Client-side error tracking (e.g., Sentry)
- [ ] Server-side error logging
- [ ] Performance monitoring (e.g., Web Vitals)
- [ ] User feedback collection

## Backup & Recovery

### Supabase Backups
- [ ] Daily automated backups enabled
- [ ] Backup retention period configured (30 days minimum)
- [ ] Backup testing performed regularly
- [ ] Point-in-time recovery tested

### Data Export
- [ ] CSV export functionality working
- [ ] Regular data exports scheduled
- [ ] Export files stored securely
- [ ] Export process documented

### Disaster Recovery
- [ ] Recovery plan documented
- [ ] Backup restoration tested
- [ ] Failover procedures documented
- [ ] Contact information for support teams

## Domain & SSL Setup

### Custom Domain Configuration
1. Purchase domain from registrar (e.g., Namecheap, GoDaddy)
2. Add domain to Vercel project:
   - Go to Project Settings > Domains
   - Enter your domain (e.g., crm.yourcompany.com)
   - Vercel will provide DNS records to add

3. Update DNS records at your registrar:
   - CNAME record: `www.yourdomain.com` → `cname.vercel-dns.com`
   - A record: `yourdomain.com` → `76.76.21.21` (Vercel's load balancer)

4. Wait for DNS propagation (can take up to 48 hours)
5. Enable SSL certificate (automatic with Vercel)

### SSL Certificate
- [ ] SSL certificate automatically provisioned by Vercel
- [ ] HTTPS enforced (redirect HTTP to HTTPS)
- [ ] Certificate renewal automatic
- [ ] Mixed content warnings resolved

### Domain Security
- [ ] DNSSEC enabled if supported
- [ ] CAA records configured
- [ ] Domain privacy enabled
- [ ] WHOIS information protected

## Performance Optimization

### Vercel Optimizations
- [ ] Image optimization enabled
- [ ] Static asset optimization
- [ ] Edge functions configured where appropriate
- [ ] CDN distribution verified

### Application Performance
- [ ] Code splitting implemented
- [ ] Bundle size optimized
- [ ] Database queries optimized
- [ ] Caching strategies implemented
- [ ] Lazy loading for components

## Testing Checklist

### Pre-Deployment Testing
- [ ] All features tested in staging environment
- [ ] Load testing performed
- [ ] Security testing completed
- [ ] Accessibility testing done
- [ ] Cross-browser testing completed

### Post-Deployment Verification
- [ ] Application loads correctly
- [ ] Authentication works
- [ ] Data operations functional
- [ ] Email functionality working
- [ ] Mobile responsiveness verified
- [ ] Performance metrics acceptable

## Maintenance & Updates

### Regular Maintenance
- [ ] Dependencies updated regularly
- [ ] Security patches applied promptly
- [ ] Database maintenance performed
- [ ] Log files rotated and archived

### Update Procedures
- [ ] Deployment process documented
- [ ] Rollback procedures defined
- [ ] Feature flags implemented for gradual rollouts
- [ ] Blue-green deployment strategy considered

## Support & Documentation

### User Documentation
- [ ] User guide created
- [ ] API documentation available
- [ ] Troubleshooting guide provided
- [ ] Contact information for support

### Developer Documentation
- [ ] Code documentation complete
- [ ] Deployment guide updated
- [ ] Architecture documentation current
- [ ] Runbook for common issues

## Emergency Contacts

- Development Team: [contact info]
- Hosting Provider (Vercel): [support links]
- Database Provider (Supabase): [support links]
- Domain Registrar: [contact info]
- Security Team: [contact info]

## Final Checklist

- [ ] All environment variables configured
- [ ] Domain and SSL working
- [ ] Monitoring and alerts set up
- [ ] Backup and recovery tested
- [ ] Security measures verified
- [ ] Performance optimized
- [ ] Documentation complete
- [ ] Support contacts updated
- [ ] Go-live approval obtained
