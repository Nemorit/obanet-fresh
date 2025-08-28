# 🚀 ObaNet Netlify Deployment Guide

## 📋 Deployment Özeti

ObaNet artık **Netlify** üzerinde serverless deployment için hazırlandı:

- ✅ **Frontend**: Next.js static export
- ✅ **Backend**: Netlify Functions (serverless)
- ✅ **Database**: MongoDB Atlas (cloud)
- ✅ **Hosting**: Netlify CDN

## 🛠️ Netlify Deployment Adımları

### 1. GitHub Repository Hazırla

```bash
cd /root/obanet-fresh
git init
git add .
git commit -m "Initial ObaNet deployment"
git branch -M main
git remote add origin https://github.com/username/obanet.git
git push -u origin main
```

### 2. Netlify Site Oluştur

1. **Netlify Dashboard**'a git: https://app.netlify.com
2. **"New site from Git"** seçin
3. **GitHub** repository'sini bağla
4. **Build settings**:
   ```
   Base directory: frontend/
   Build command: npm run build
   Publish directory: frontend/.next
   ```

### 3. Environment Variables (Netlify Dashboard)

**Site Settings > Environment Variables** bölümünde:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/obanet?retryWrites=true&w=majority

# JWT Secrets
JWT_SECRET=your-production-jwt-secret-256-bit
JWT_REFRESH_SECRET=your-production-refresh-secret-256-bit
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# App Config
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_APP_NAME=ObaNet
NEXT_PUBLIC_APP_VERSION=1.0.0

# Optional: Redis (if using Redis cloud)
REDIS_URL=redis://username:password@host:port
```

### 4. MongoDB Atlas Setup

1. **MongoDB Atlas**'a kaydol: https://www.mongodb.com/atlas
2. **Cluster oluştur** (free tier)
3. **Database user** ve **password** oluştur
4. **Network Access**: `0.0.0.0/0` (Netlify IP'leri için)
5. **Connection string**'i kopyala
6. Netlify **Environment Variables**'a `MONGODB_URI` ekle

### 5. Deploy Trigger

- Netlify otomatik olarak Git push'larda deploy yapar
- Manual deploy: Netlify dashboard'dan **"Trigger deploy"**

## 📁 Netlify Dosya Yapısı

```
obanet-fresh/
├── netlify.toml              # Netlify configuration
├── netlify/functions/        # Serverless functions
│   ├── api.js               # Main API function
│   └── package.json         # Function dependencies
└── frontend/                # Next.js application
    ├── src/
    ├── package.json
    └── next.config.js       # Updated for production
```

## 🔧 Netlify Configuration (netlify.toml)

```toml
[build]
  base = "frontend/"
  command = "npm run build"
  publish = "frontend/.next"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
```

## 🌐 Domain Ayarları

### Custom Domain
1. **Site Settings > Domain Settings**
2. **Add custom domain**: `obanet.com`
3. **DNS settings**'i güncelleyin
4. **SSL Certificate** otomatik olarak sağlanır

### Subdomain
- Frontend: `https://obanet.netlify.app`
- API: `https://obanet.netlify.app/api/v1`

## 📊 Production Features

### Performans Optimizasyonları
- ✅ **CDN**: Global edge locations
- ✅ **Compression**: Gzip/Brotli
- ✅ **Image Optimization**: Next.js optimized images
- ✅ **Caching**: Static asset caching
- ✅ **Serverless**: Auto-scaling functions

### Güvenlik
- ✅ **HTTPS**: Automatically enforced
- ✅ **Security Headers**: CSP, HSTS, XSS protection
- ✅ **Rate Limiting**: API endpoint protection
- ✅ **CORS**: Configured for production domains

## 🐛 Troubleshooting

### Build Errors
```bash
# Check build logs in Netlify dashboard
# Common issues:
- Environment variables missing
- Package.json dependencies
- MongoDB connection string
```

### Function Timeout
```bash
# Netlify Functions timeout: 10 seconds (free), 15 seconds (pro)
# Optimize database queries
# Use connection pooling
```

### Database Connection
```bash
# MongoDB Atlas whitelist: 0.0.0.0/0
# Connection string format check
# Network access settings
```

## 📈 Monitoring

### Netlify Analytics
- **Site Settings > Analytics**
- Page views, unique visitors
- Performance metrics

### Function Logs
- **Functions** tab in Netlify dashboard
- Real-time log streaming
- Error tracking

## 🔄 CI/CD Pipeline

### Automatic Deployment
```bash
git push origin main  # Triggers automatic deploy
```

### Branch Deployments
```bash
git push origin feature-branch  # Creates preview deployment
```

### Deploy Previews
- Pull request deployments
- Preview URLs for testing
- Automatic cleanup

## 📱 Production URLs

After deployment:
- **Website**: `https://obanet.netlify.app`
- **API Health**: `https://obanet.netlify.app/api/v1/health`
- **API Docs**: `https://obanet.netlify.app/api/v1`

## 🎯 Next Steps

1. ✅ **Deploy to Netlify**
2. ✅ **Setup MongoDB Atlas**
3. ✅ **Configure Environment Variables**
4. ✅ **Test Production API**
5. 🔄 **Setup Custom Domain**
6. 🔄 **Configure Analytics**
7. 🔄 **Setup Monitoring**

ObaNet artık production-ready ve Netlify'da deploy edilmeye hazır! 🏕️🚀