const User = require("../models/User");
const Notification = require("../models/Notification");
const { Types } = require("mongoose");

/**
 * Notification service for handling GRN-related notifications
 */
class NotificationService {
  /**
   * Send notification to users with specific roles
   * @param {Object} options - Notification options
   * @param {string} options.type - Notification type (e.g., 'GRN_CREATED', 'GRN_APPROVED')
   * @param {string} options.title - Notification title
   * @param {string} options.message - Notification message
   * @param {Object} options.metadata - Additional metadata
   * @param {string[]} options.roles - Array of role names to notify
   * @param {string} [options.senderId] - ID of the user who triggered the notification
   * @param {string} [options.entityType] - Type of entity (e.g., 'GRN', 'PO')
   * @param {string} [options.entityId] - ID of the related entity
   * @returns {Promise<Array>} Array of created notifications
   */
  static async notifyRoles({
    type,
    title,
    message,
    metadata = {},
    roles = [],
    senderId = null,
    entityType = null,
    entityId = null,
  }) {
    try {
      // Find users with the specified roles
      const users = await User.find({
        role: { $in: roles },
        is_active: true,
        email_notifications: true, // Only users who have email notifications enabled
      }).select('_id email name');

      if (users.length === 0) {
        return [];
      }

      const notifications = users.map((user) => ({
        user_id: user._id,
        type,
        title,
        message,
        is_read: false,
        metadata: {
          ...metadata,
          recipient_email: user.email,
          recipient_name: user.name,
        },
        sender_id: senderId ? Types.ObjectId(senderId) : null,
        entity_type: entityType,
        entity_id: entityId ? Types.ObjectId(entityId) : null,
      }));

      // Save notifications to the database
      const createdNotifications = await Notification.insertMany(notifications);

      // In a production environment, you would also send emails/websocket events here
      // await this.sendEmailNotifications(createdNotifications);
      // await this.sendWebSocketNotifications(createdNotifications);

      return createdNotifications;
    } catch (error) {
      console.error('Error sending notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification to specific users
   * @param {Object} options - Notification options
   * @param {string} options.type - Notification type
   * @param {string} options.title - Notification title
   * @param {string} options.message - Notification message
   * @param {string[]} options.userIds - Array of user IDs to notify
   * @param {Object} [options.metadata] - Additional metadata
   * @param {string} [options.senderId] - ID of the user who triggered the notification
   * @param {string} [options.entityType] - Type of entity
   * @param {string} [options.entityId] - ID of the related entity
   * @returns {Promise<Array>} Array of created notifications
   */
  static async notifyUsers({
    type,
    title,
    message,
    userIds = [],
    metadata = {},
    senderId = null,
    entityType = null,
    entityId = null,
  }) {
    try {
      if (!userIds || userIds.length === 0) {
        return [];
      }

      // Find users with the specified IDs
      const users = await User.find({
        _id: { $in: userIds.map(id => Types.ObjectId(id)) },
        is_active: true,
      }).select('_id email name');

      if (users.length === 0) {
        return [];
      }

      const notifications = users.map((user) => ({
        user_id: user._id,
        type,
        title,
        message,
        is_read: false,
        metadata: {
          ...metadata,
          recipient_email: user.email,
          recipient_name: user.name,
        },
        sender_id: senderId ? Types.ObjectId(senderId) : null,
        entity_type: entityType,
        entity_id: entityId ? Types.ObjectId(entityId) : null,
      }));

      // Save notifications to the database
      const createdNotifications = await Notification.insertMany(notifications);

      // In a production environment, you would also send emails/websocket events here
      // await this.sendEmailNotifications(createdNotifications);
      // await this.sendWebSocketNotifications(createdNotifications);

      return createdNotifications;
    } catch (error) {
      console.error('Error sending user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notifications as read
   * @param {string|string[]} notificationIds - Single notification ID or array of IDs
   * @param {string} userId - ID of the user marking notifications as read
   * @returns {Promise<Object>} Update result
   */
  static async markAsRead(notificationIds, userId) {
    try {
      const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
      
      const result = await Notification.updateMany(
        {
          _id: { $in: ids },
          user_id: Types.ObjectId(userId),
          is_read: false,
        },
        {
          $set: {
            is_read: true,
            read_at: new Date(),
          },
        }
      );

      return result;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread notifications for a user
   * @param {string} userId - User ID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=50] - Maximum number of notifications to return
   * @param {number} [options.page=1] - Page number for pagination
   * @returns {Promise<Object>} Paginated notifications
   */
  static async getUnreadNotifications(userId, { limit = 50, page = 1 } = {}) {
    try {
      const skip = (page - 1) * limit;
      
      const [notifications, total] = await Promise.all([
        Notification.find({
          user_id: Types.ObjectId(userId),
          is_read: false,
        })
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .populate('sender_id', 'name email')
          .lean(),
        Notification.countDocuments({
          user_id: Types.ObjectId(userId),
          is_read: false,
        }),
      ]);

      return {
        data: notifications,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      throw error;
    }
  }

  /**
   * Get all notifications for a user
   * @param {string} userId - User ID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=50] - Maximum number of notifications to return
   * @param {number} [options.page=1] - Page number for pagination
   * @param {string} [options.type] - Filter by notification type
   * @param {boolean} [options.isRead] - Filter by read status
   * @returns {Promise<Object>} Paginated notifications
   */
  static async getUserNotifications(
    userId,
    { limit = 50, page = 1, type, isRead } = {}
  ) {
    try {
      const skip = (page - 1) * limit;
      
      const query = { user_id: Types.ObjectId(userId) };
      
      if (type) {
        query.type = type;
      }
      
      if (isRead !== undefined) {
        query.is_read = isRead;
      }
      
      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .populate('sender_id', 'name email')
          .lean(),
        Notification.countDocuments(query),
      ]);

      return {
        data: notifications,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Send email notifications (placeholder for actual email sending)
   * @private
   * @param {Array} notifications - Array of notification documents
   */
  static async sendEmailNotifications(notifications) {
    // In a real implementation, this would use a service like Nodemailer, SendGrid, etc.
    // This is a placeholder that logs the notifications that would be sent
    console.log('Sending email notifications:', notifications);
  }

  /**
   * Send WebSocket notifications (placeholder for actual WebSocket implementation)
   * @private
   * @param {Array} notifications - Array of notification documents
   */
  static async sendWebSocketNotifications(notifications) {
    // In a real implementation, this would use WebSockets to push notifications in real-time
    // This is a placeholder that logs the WebSocket notifications that would be sent
    console.log('Sending WebSocket notifications:', notifications);
  }
}

module.exports = NotificationService;
