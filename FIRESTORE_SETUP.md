# Firestore İndeks Gereksinimleri

Bu dosya, Fetva AI uygulamasının Firestore sorgularını hızlandırmak için gerekli indeksleri içerir.

## Gerekli İndeksler

### 1. Chats Koleksiyonu
```
Collection: chats
Fields:
  - userId (Ascending)
  - updatedAt (Descending)
```

### 2. Messages Koleksiyonu
```
Collection: messages
Fields:
  - chatId (Ascending)
  - timestamp (Ascending)
```

## Kurulum

1. Firebase Console'a git: https://console.firebase.google.com
2. Projenizi seçin (fetva-ai-7fee1)
3. Firestore Database > Indexes sekmesine git
4. "Create Index" butonuna tıklayın
5. Yukarıdaki indeksleri oluşturun

**NOT**: İlk sorgu yapıldığında Firebase otomatik olarak indeks oluşturma linki verecektir. Bu linke tıklayarak da indeksleri oluşturabilirsiniz.

## Firestore Kuralları

Aşağıdaki kuralları Firestore Rules sekmesine ekleyin:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Chats collection
    match /chats/{chatId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    // Messages collection
    match /messages/{messageId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
  }
}
```
