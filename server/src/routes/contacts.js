const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
  searchUsers, sendRequest, acceptRequest, declineRequest,
  getContacts, removeContact, blockUser, unblockUser,
  saveContactInfo, getUserProfile,
} = require('../controllers/contactController');

router.get('/search', protect, searchUsers);
router.get('/', protect, getContacts);
router.get('/:userId/profile', protect, getUserProfile);
router.post('/request/:userId', protect, sendRequest);
router.put('/accept/:userId', protect, acceptRequest);
router.put('/decline/:userId', protect, declineRequest);
router.put('/block/:userId', protect, blockUser);
router.put('/unblock/:userId', protect, unblockUser);
router.put('/:userId/info', protect, saveContactInfo);
router.delete('/:userId', protect, removeContact);

module.exports = router;
