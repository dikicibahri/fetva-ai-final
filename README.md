# Fetva AI - İslami Dini Danışman

Diyanet İşleri Başkanlığı fetvalarını yapay zeka destekli arama ile keşfedin.

## 🌟 Özellikler

### Akıllı Arama
- **Yapay Zeka Destekli**: Groq AI (Llama 3.3 70B) ile doğal dil işleme
- **Çoklu Kaynak**: Diyanet Fetva Kitabı, Ömer Nasuhi Bilmen İlmihali, TDV İlmihali
- **Sinonim Desteği**: Türkçe dini terimlerde esnek arama
- **Bağlam Takibi**: Takip soruları için konuşma geçmişi

### Kullanıcı Özellikleri
- **25 Ücretsiz Sorgu**: Giriş yapmadan 25 soruya kadar kullanım
- **Firebase Auth**: Email/şifre ve Google ile giriş
- **Sohbet Geçmişi**: Firestore ile kalıcı sohbet kayıtları
- **Çoklu Sohbet**: Farklı konularda ayrı sohbetler oluşturma
- **Komik Mod**: Opsiyonel esprili ve samimi cevaplar 😄

### Kullanıcı Deneyimi
- **Otomatik Scroll**: Yeni mesajlarda otomatik kaydırma
- **İlk Harf Büyük**: Input'ta otomatik büyük harf
- **Karanlık/Aydınlık Tema**: Göz dostu tema seçenekleri
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu

## 🚀 Kurulum

### Gereksinimler
- Node.js (v14 veya üzeri)
- Firebase hesabı (ücretsiz)

### Adımlar

1. **Depoyu klonlayın**
```bash
git clone https://github.com/kullaniciadi/fetva-ai.git
cd fetva-ai
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
```

3. **Firebase Kurulumu**
   - [Firebase Console](https://console.firebase.google.com)'da yeni proje oluşturun
   - Authentication'ı etkinleştirin (Email/Password ve Google)
   - Firestore Database oluşturun
   - `index.html` ve `auth.js` dosyalarındaki Firebase config'i güncelleyin
   - Firestore indekslerini oluşturun (bkz. `FIRESTORE_SETUP.md`)

4. **Groq API Key**
   - [Groq Console](https://console.groq.com)'dan API key alın
   - `script.js` dosyasındaki `API_CONFIG.apiKey` değerini güncelleyin

5. **Sunucuyu başlatın**
```bash
node server.js
```

6. **Tarayıcıda açın**
```
http://localhost:3000
```

## 📁 Proje Yapısı

```
fetva-ai/
├── index.html          # Ana sayfa
├── login.html          # Giriş/kayıt sayfası
├── script.js           # Ana uygulama mantığı
├── auth.js             # Firebase auth işlemleri
├── style.css           # Stil dosyası
├── data.js             # Fetva veritabanı (otomatik oluşturulur)
├── server.js           # Groq API proxy sunucusu
├── FIRESTORE_SETUP.md  # Firestore kurulum talimatları
└── README.md           # Bu dosya
```

## 🎯 Kullanım

1. **Giriş Yapmadan Kullanım**
   - İlk 25 sorgu için giriş gerekmez
   - Sohbet geçmişi kaydedilmez

2. **Giriş Yaparak Kullanım**
   - Sınırsız sorgu
   - Sohbet geçmişi Firestore'da saklanır
   - Çoklu sohbet yönetimi
   - Komik mod tercihi

3. **Komik Mod**
   - Kayıt olurken veya profil ayarlarından etkinleştirin
   - AI cevaplarına samimi ve esprili notlar ekler

## 🔧 Teknolojiler

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **AI**: Groq API (Llama 3.3 70B Versatile)
- **Backend**: Node.js, Express
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Fonts**: Inter, Amiri (Google Fonts)

## 📝 Lisans

MIT License

## 🤝 Katkıda Bulunma

Pull request'ler memnuniyetle karşılanır. Büyük değişiklikler için lütfen önce bir issue açın.

## 📧 İletişim

Sorularınız için issue açabilirsiniz.
