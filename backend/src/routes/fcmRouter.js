const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

router.post('/save-fcm-token', async (req, res) => {
    const { userId, fcmToken } = req.body;
    if (!userId || !fcmToken) return res.status(400).json({ error: "Missing fields" });

    try {
        await db.collection('users').doc(userId).update({ fcmToken });
        console.log(`✅ Saved FCM token for ${userId}`);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
