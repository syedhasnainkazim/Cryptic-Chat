const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/conversationController');

router.get('/', protect, c.getConversations);
router.post('/dm/:userId', protect, c.getOrCreateDM);
router.post('/group', protect, c.createGroup);
router.get('/:conversationId/messages', protect, c.getMessages);
router.post('/:conversationId/messages', protect, c.sendMessage);
router.put('/:conversationId/read', protect, c.markRead);
router.put('/:conversationId/pin/:messageId', protect, c.pinMessage);
router.put('/:conversationId/disappearing', protect, c.setDisappearing);
router.put('/:conversationId/lock', protect, c.setLock);
router.post('/:conversationId/verify-pin', protect, c.verifyPin);
router.put('/:conversationId/group', protect, c.updateGroup);
router.post('/:conversationId/members', protect, c.addGroupMember);
router.delete('/:conversationId/members/:userId', protect, c.removeGroupMember);
router.put('/messages/:messageId/react', protect, c.reactToMessage);
router.put('/messages/:messageId/edit', protect, c.editMessage);
router.delete('/messages/:messageId', protect, c.deleteForEveryone);
router.delete('/:conversationId', protect, c.deleteConversation);

module.exports = router;
