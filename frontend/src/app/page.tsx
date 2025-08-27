'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { 
  GlobeEuropeAfricaIcon, 
  UserGroupIcon, 
  HeartIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  MapPinIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function HomePage() {
  const [stats, setStats] = useState({
    users: 0,
    communities: 0,
    countries: 0,
    posts: 0
  })

  useEffect(() => {
    // Animate numbers on load
    const animateNumbers = () => {
      const targets = { users: 15420, communities: 248, countries: 23, posts: 8934 }
      const duration = 2000
      const steps = 60
      const interval = duration / steps

      let currentStep = 0
      const timer = setInterval(() => {
        currentStep++
        const progress = currentStep / steps
        
        setStats({
          users: Math.floor(targets.users * progress),
          communities: Math.floor(targets.communities * progress),
          countries: Math.floor(targets.countries * progress),
          posts: Math.floor(targets.posts * progress)
        })

        if (currentStep >= steps) {
          clearInterval(timer)
          setStats(targets)
        }
      }, interval)
    }

    animateNumbers()
  }, [])

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary-500 via-secondary-500 to-primary-600">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-oba-pattern opacity-10"></div>
        
        {/* Floating Elements */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ y: [-20, 20, -20] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl"
          />
          <motion.div
            animate={{ y: [20, -20, 20] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-20 right-20 w-48 h-48 bg-white/5 rounded-full blur-2xl"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-8"
          >
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-full text-white/90 text-sm font-medium backdrop-blur-sm">
                <SparklesIcon className="w-4 h-4 mr-2" />
                Dijital Diaspora Platformu
              </div>
              
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white">
                <span className="block">Dünyada</span>
                <span className="block cultural-text bg-gradient-to-r from-yellow-300 via-orange-200 to-white bg-clip-text text-transparent">
                  Bağlantıda
                </span>
                <span className="block">Kalın</span>
              </h1>
              
              <p className="max-w-3xl mx-auto text-xl sm:text-2xl text-white/90 font-medium leading-relaxed">
                Dünyanın dört bir yanındaki Türk diaspora toplulukları için 
                <br />
                <span className="text-yellow-300">modern buluşma noktası</span>
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/kayit-ol" className="oba-button bg-white text-primary-600 hover:bg-gray-50 px-8 py-4 text-lg font-semibold rounded-xl shadow-xl transform hover:scale-105 transition-all duration-200">
                Hemen Katıl
                <ArrowRightIcon className="w-5 h-5 ml-2 inline" />
              </Link>
              
              <Link href="/topluluklar" className="px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all duration-200">
                Toplulukları Keşfet
              </Link>
            </motion.div>

            <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mt-16">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white">
                  {stats.users.toLocaleString('tr-TR')}+
                </div>
                <div className="text-white/80 font-medium">Aktif Üye</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white">
                  {stats.communities.toLocaleString('tr-TR')}+
                </div>
                <div className="text-white/80 font-medium">Topluluk</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white">
                  {stats.countries}+
                </div>
                <div className="text-white/80 font-medium">Ülke</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white">
                  {stats.posts.toLocaleString('tr-TR')}+
                </div>
                <div className="text-white/80 font-medium">Paylaşım</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/60 rounded-full mt-2"></div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Diaspora Deneyiminizi <span className="cultural-text">Zenginleştirin</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Kültürünüzü yaşayın, hikayelerinizi paylaşın, yeni bağlantılar kurun
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: UserGroupIcon,
                title: 'Oba Toplulukları',
                description: 'Şehrinizde, ülkenizde veya ortak ilgi alanlarınız doğrultusunda topluluklar oluşturun ve katılın.',
                color: 'primary'
              },
              {
                icon: GlobeEuropeAfricaIcon,
                title: 'Diaspora Haritası',
                description: 'Dünyanın her yerindeki Türk toplulukları ile bağlantı kurun ve yerel etkinlikleri keşfedin.',
                color: 'secondary'
              },
              {
                icon: ChatBubbleLeftRightIcon,
                title: 'Kültürel Sohbet',
                description: 'Ana dilinizde sohbet edin, deneyimlerinizi paylaşın ve yeni dostluklar kurun.',
                color: 'diaspora'
              },
              {
                icon: CalendarDaysIcon,
                title: 'Etkinlik Takvimi',
                description: 'Kültürel etkinlikleri, festivalleri ve buluşmaları takip edin, kendi etkinliklerinizi organize edin.',
                color: 'primary'
              },
              {
                icon: HeartIcon,
                title: 'Diaspora Hikayeleri',
                description: 'Göç hikayelerinizi, başarı öykülerinizi paylaşın ve ilham verin.',
                color: 'secondary'
              },
              {
                icon: MapPinIcon,
                title: 'Yerel Rehber',
                description: 'Yaşadığınız şehirde Türk işletmelerini, restoranları ve hizmetleri keşfedin.',
                color: 'diaspora'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="oba-card group hover:shadow-cultural transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-lg bg-${feature.color}-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-600`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary-600 to-secondary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Dijital Diaspora Yolculuğunuza Başlayın
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Binlerce diaspora üyesi sizi bekliyor. Kültürünüzü yaşamaya, 
              hikayelerinizi paylaşmaya ve yeni bağlantılar kurmaya bugün başlayın.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/kayit-ol" className="inline-flex items-center px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-gray-50 transform hover:scale-105 transition-all duration-200 shadow-xl">
                Ücretsiz Hesap Oluştur
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </Link>
              
              <Link href="/hakkimizda" className="inline-flex items-center px-8 py-4 text-white border-2 border-white/30 font-semibold rounded-xl hover:bg-white/10 transition-all duration-200">
                Daha Fazla Bilgi
              </Link>
            </div>

            <p className="text-white/70 text-sm">
              💡 Üyelik tamamen ücretsiz • 🔒 Verileriniz güvende • 🌍 Çok dilli destek
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  )
}