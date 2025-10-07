const express = require('express');
const { authenticate } = require('../middleware/auth');
const notificationController = require('../controllers/notification.controller');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// Middleware to ensure user is authenticated for all notification routes
router.use(authenticate);

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for the authenticated user
 * @access  Private
 */
router.get('/', notificationController.getNotifications);

/**
 * @route   GET /api/notifications/unread
 * @desc    Get unread notifications for the authenticated user
 * @access  Private
 */
router.get('/unread', notificationController.getUnreadNotifications);

/**
 * @route   GET /api/notifications/unread/count
 * @desc    Get count of unread notifications for the authenticated user
 * @access  Private
 */
router.get('/unread/count', notificationController.getUnreadCount);

/**
 * @route   PUT /api/notifications/read/:id
 * @desc    Mark a notification as read
 * @access  Private
 */
router.put('/read/:id', notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read for the authenticated user
 * @access  Private
 */
router.put('/read-all', notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', notificationController.deleteNotification);

/**
 * @route   DELETE /api/notifications
 * @desc    Delete all notifications for the authenticated user
 * @access  Private
 */
router.delete('/', notificationController.deleteAllNotifications);

/**
 * @route   POST /api/notifications/test
 * @desc    Send a test notification (for development only)
 * @access  Private (Admin only in production)
 */
router.post('/test', notificationController.sendTestNotification);

module.exports = router;
