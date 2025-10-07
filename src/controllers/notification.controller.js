const Notification = require("../models/Notification");
const NotificationService = require("../services/notification.service");
const { Types } = require("mongoose");
const { check, validationResult } = require('express-validator');

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for the authenticated user
 * @access  Private
 */
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, is_read } = req.query;
    const userId = req.user._id;

    const result = await NotificationService.getUserNotifications(userId, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 50), // Max 50 per page
      type,
      isRead: is_read ? is_read === 'true' : undefined
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notifications',
      message: error.message
    });
  }
};

/**
 * @route   GET /api/notifications/unread
 * @desc    Get unread notifications for the authenticated user
 * @access  Private
 */
exports.getUnreadNotifications = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user._id;

    const result = await NotificationService.getUnreadNotifications(userId, {
      limit: Math.min(parseInt(limit, 10), 50) // Max 50 per request
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve unread notifications',
      message: error.message
    });
  }
};

/**
 * @route   GET /api/notifications/unread/count
 * @desc    Get count of unread notifications for the authenticated user
 * @access  Private
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await Notification.countDocuments({
      user_id: userId,
      is_read: false
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve unread notification count',
      message: error.message
    });
  }
};

/**
 * @route   PUT /api/notifications/read/:id
 * @desc    Mark a notification as read
 * @access  Private
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Validate notification ID
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification ID'
      });
    }

    // Check if the notification exists and belongs to the user
    const notification = await Notification.findOne({
      _id: id,
      user_id: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or access denied'
      });
    }

    // Mark as read
    await NotificationService.markAsRead(id, userId);

    res.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
};

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read for the authenticated user
 * @access  Private
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      message: error.message
    });
  }
};

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Validate notification ID
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification ID'
      });
    }

    // Delete the notification if it belongs to the user
    const result = await Notification.findOneAndDelete({
      _id: id,
      user_id: userId
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      message: error.message
    });
  }
};

/**
 * @route   DELETE /api/notifications
 * @desc    Delete all notifications for the authenticated user
 * @access  Private
 */
exports.deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.deleteMany({ user_id: userId });

    res.json({
      success: true,
      message: 'All notifications deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete all notifications',
      message: error.message
    });
  }
};

/**
 * @route   POST /api/notifications/test
 * @desc    Send a test notification (for development only)
 * @access  Private (Admin only in production)
 */
exports.sendTestNotification = async (req, res) => {
  // This is for testing purposes only - restrict access in production
  if (process.env.NODE_ENV === 'production' && !req.user.roles.includes('admin')) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to perform this action'
    });
  }

  try {
    const { title, message, type = 'TEST_NOTIFICATION' } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    // Send notification to the current user
    const notification = await NotificationService.notifyUsers({
      type,
      title,
      message,
      userIds: [req.user._id],
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: 'Test notification sent',
      data: notification
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
      message: error.message
    });
  }
};
