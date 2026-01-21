/**
 * Fetva AI - Database Service Layer
 * Handles all Firestore operations for chat history
 * Uses Firebase Compat SDK (global firebase object)
 */

// db is already initialized in index.html as firebase.firestore()
// We use the global db variable

/**
 * Start a new chat session
 * @param {string} userId - The user's UID
 * @param {string} firstMessage - The first message to generate title from
 * @returns {Promise<string>} - The new chat ID
 */
async function startNewChat(userId, firstMessage) {
    try {
        const chatsRef = db.collection('users').doc(userId).collection('chats');

        // Generate title from first 30 chars of message
        const title = firstMessage.length > 30
            ? firstMessage.substring(0, 30) + '...'
            : firstMessage;

        const chatDoc = await chatsRef.add({
            title: title,
            preview: firstMessage.substring(0, 100),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ New chat created:', chatDoc.id);
        return chatDoc.id;

    } catch (error) {
        console.error('❌ Error creating new chat:', error);
        throw error;
    }
}

/**
 * Save a message to a chat
 * @param {string} userId - The user's UID
 * @param {string} chatId - The chat document ID
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - The message content
 * @param {Array} sources - Optional sources array for assistant messages
 * @returns {Promise<string>} - The new message ID
 */
async function saveMessage(userId, chatId, role, content, sources = []) {
    try {
        const messagesRef = db.collection('users').doc(userId)
            .collection('chats').doc(chatId)
            .collection('messages');

        const messageData = {
            role: role,
            content: content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add sources if provided (for assistant messages)
        if (role === 'assistant' && sources.length > 0) {
            messageData.sources = sources;
        }

        const messageDoc = await messagesRef.add(messageData);

        // Update chat's updatedAt and preview
        const chatRef = db.collection('users').doc(userId)
            .collection('chats').doc(chatId);

        await chatRef.update({
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            preview: content.substring(0, 100)
        });

        console.log('✅ Message saved:', messageDoc.id);
        return messageDoc.id;

    } catch (error) {
        console.error('❌ Error saving message:', error);
        throw error;
    }
}

/**
 * Get all chats for a user
 * @param {string} userId - The user's UID
 * @returns {Promise<Array>} - Array of chat objects with id and data
 */
async function getUserChats(userId) {
    try {
        const chatsRef = db.collection('users').doc(userId).collection('chats');
        const snapshot = await chatsRef
            .orderBy('updatedAt', 'desc')
            .get();

        const chats = [];
        snapshot.forEach(doc => {
            chats.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log('✅ Loaded', chats.length, 'chats');
        return chats;

    } catch (error) {
        console.error('❌ Error getting user chats:', error);
        throw error;
    }
}

/**
 * Get all messages for a specific chat
 * @param {string} userId - The user's UID
 * @param {string} chatId - The chat document ID
 * @returns {Promise<Array>} - Array of message objects
 */
async function getChatMessages(userId, chatId) {
    try {
        const messagesRef = db.collection('users').doc(userId)
            .collection('chats').doc(chatId)
            .collection('messages');

        const snapshot = await messagesRef
            .orderBy('createdAt', 'asc')
            .get();

        const messages = [];
        snapshot.forEach(doc => {
            messages.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log('✅ Loaded', messages.length, 'messages for chat:', chatId);
        return messages;

    } catch (error) {
        console.error('❌ Error getting chat messages:', error);
        throw error;
    }
}

/**
 * Update chat title
 * @param {string} userId - The user's UID
 * @param {string} chatId - The chat document ID
 * @param {string} newTitle - The new title
 * @returns {Promise<void>}
 */
async function updateChatTitle(userId, chatId, newTitle) {
    try {
        const chatRef = db.collection('users').doc(userId)
            .collection('chats').doc(chatId);

        await chatRef.update({
            title: newTitle,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Chat title updated:', chatId);

    } catch (error) {
        console.error('❌ Error updating chat title:', error);
        throw error;
    }
}

/**
 * Delete a chat and all its messages
 * @param {string} userId - The user's UID
 * @param {string} chatId - The chat document ID
 * @returns {Promise<void>}
 */
async function deleteChat(userId, chatId) {
    try {
        const chatRef = db.collection('users').doc(userId)
            .collection('chats').doc(chatId);

        // First delete all messages in the subcollection
        const messagesRef = chatRef.collection('messages');
        const messagesSnapshot = await messagesRef.get();

        const batch = db.batch();
        messagesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // Then delete the chat document
        await chatRef.delete();

        console.log('✅ Chat deleted:', chatId);

    } catch (error) {
        console.error('❌ Error deleting chat:', error);
        throw error;
    }
}

/**
 * Share a chat and get a public share ID
 * @param {string} userId - The user's UID
 * @param {string} chatId - The chat document ID
 * @returns {Promise<string>} - The share ID
 */
async function shareChat(userId, chatId) {
    try {
        // Get chat data
        const chatRef = db.collection('users').doc(userId).collection('chats').doc(chatId);
        const chatDoc = await chatRef.get();

        if (!chatDoc.exists) {
            throw new Error('Chat not found');
        }

        // Get messages
        const messages = await getChatMessages(userId, chatId);

        // Create shared chat document in public collection
        const sharedChatRef = db.collection('shared_chats');
        const shareDoc = await sharedChatRef.add({
            title: chatDoc.data().title,
            messages: messages,
            sharedBy: userId,
            sharedAt: firebase.firestore.FieldValue.serverTimestamp(),
            originalChatId: chatId
        });

        // Update original chat with share ID
        await chatRef.update({
            shareId: shareDoc.id,
            isShared: true
        });

        console.log('✅ Chat shared with ID:', shareDoc.id);
        return shareDoc.id;

    } catch (error) {
        console.error('❌ Error sharing chat:', error);
        throw error;
    }
}

/**
 * Get a shared chat by share ID (public access)
 * @param {string} shareId - The share document ID
 * @returns {Promise<Object>} - The shared chat data with messages
 */
async function getSharedChat(shareId) {
    try {
        const shareDoc = await db.collection('shared_chats').doc(shareId).get();

        if (!shareDoc.exists) {
            return null;
        }

        console.log('✅ Loaded shared chat:', shareId);
        return {
            id: shareDoc.id,
            ...shareDoc.data()
        };

    } catch (error) {
        console.error('❌ Error getting shared chat:', error);
        throw error;
    }
}

// Export functions for use in script.js
// Since we're using compat SDK with global scope, we attach to window
window.dbService = {
    startNewChat,
    saveMessage,
    getUserChats,
    getChatMessages,
    updateChatTitle,
    deleteChat,
    shareChat,
    getSharedChat
};

console.log('📦 Database Service Layer loaded');
