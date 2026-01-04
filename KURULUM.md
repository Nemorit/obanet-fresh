# 🏕️ ObaNet Kurulum Rehberi

## Sistem Gereksinimleri
- Node.js 18+ 
- MongoDB (yerel veya cloud)
- Redis (opsiyonel - önbellekleme için)
- npm veya yarn

## Backend Kurulumu

### 1. Bağımlılıkları Yükle
```bash
cd backend
npm install
```

### 2. Ortam Değişkenlerini Ayarla
`.env` dosyası zaten oluşturuldu. Gerekirse düzenleyin:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/obanet
JWT_SECRET=obanet-super-secret-jwt-key-development-only
```

### 3. MongoDB'yi Başlat
```bash
# MongoDB servisini başlat (sistem bağımlı)

# veya
brew services start mongodb/brew/mongodb-community
```

### 4. Backend'i Çalıştır
```bash
cd backend
npm run dev
```

Backend http://localhost:5000 adresinde çalışacak.

## Frontend Kurulumu

### 1. Bağımlılıkları Yükle
```bash
cd frontend
npm install
```

### 2. Frontend'i Çalıştır
```bash
cd frontend
npm run dev
```

Frontend http://localhost:3000 adresinde çalışacak.

## API Test Etme

### Health Check
```bash
curl http://localhost:5000/health
```

### API Dokümantasyonu
```bash
curl http://localhost:5000/api/v1
```

### Kullanıcı Kayıt
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Fatih",
    "lastName": "Bilgiç",
    "username": "fatihbilgic",
    "email": "fatih@example.com",
    "password": "Password123",
    "confirmPassword": "Password123",
    "diasporaProfile": {
      "currentCountry": "Germany",
      "currentCity": "Berlin",
      "originCity": "Istanbul",
      "diasporaGeneration": "1st"
    }
  }'
```

## Geliştirme Notları

### Proje Yapısı
```
obanet-fresh/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── config/         # Veritabanı ve yapılandırma
│   │   ├── controllers/    # API controller'ları
│   │   ├── middleware/     # Express middleware'leri
│   │   ├── models/         # MongoDB modelleri
│   │   ├── routes/         # API route'ları
│   │   └── server.js       # Ana server dosyası
│   ├── package.json
│   └── .env
├── frontend/               # Next.js React uygulaması
│   ├── src/
│   │   ├── app/           # Next.js 14 App Router
│   │   ├── components/    # React bileşenleri
│   │   ├── contexts/      # React context'leri
│   │   ├── lib/           # Utility fonksiyonları
│   │   └── styles/        # CSS dosyaları
│   ├── package.json
│   └── tailwind.config.ts
└── README.md
```

### Özellikler
- ✅ JWT Authentication
- ✅ Diaspora Profilleri
- ✅ Topluluk Sistemi
- ✅ Post & Comment Sistemi
- ✅ Real-time Socket.IO
- ✅ Redis Önbellekleme
- ✅ Responsive Tasarım
- ✅ Çok Dilli Destek (TR, EN, DE, FR)
- ✅ Türk Kültürel Tasarım Sistemi

### Veritabanı Modelleri
- **User**: Kullanıcı profilleri ve diaspora bilgileri
- **Community**: Topluluk yönetimi ve üyelik sistemi  
- **Post**: İçerik paylaşımı ve etkileşim
- **Event**: Etkinlik organizasyonu

### API Endpoint'leri
- `/api/v1/auth/*` - Kimlik doğrulama
- `/api/v1/users/*` - Kullanıcı yönetimi
- `/api/v1/communities/*` - Topluluk işlemleri
- `/api/v1/posts/*` - İçerik yönetimi

## Üretim Dağıtımı

### Backend (Node.js)
```bash
npm run build
npm start
```

### Frontend (Next.js)
```bash
npm run build
npm start
```

### Docker Desteği (Gelecekte)
```dockerfile
# Dockerfile planlanıyor
```

## Sorun Giderme

### Port Çakışması
- Backend varsayılan port: 5000
- Frontend varsayılan port: 3000
- Çevresel değişkenlerle değiştirilebilir

### MongoDB Bağlantı Sorunu
- MongoDB servisinin çalıştığından emin olun
- MONGODB_URI'yi kontrol edin

### Redis Sorunları
- Redis opsiyonel, çalışmasa da uygulama başlar
- Önbellekleme devre dışı kalır

## Diaspora Özellikleri

### Desteklenen Ülkeler
- Germany, France, Netherlands, Belgium
- Austria, Switzerland, UK, USA
- Canada, Australia, Turkey

### Kültürel Tasarım Elemanları
- Oba Circles: Yuvarlak tasarım dili
- Keçe Cards: Dokulu kart bileşenleri
- Göçebe Navigation: Akıcı navigasyon
- Turkish Cultural Colors: Türk bayrağı ve gün batımı renkleri

Detaylı geliştirici dokümantasyonu için: https://docs.obanet.com