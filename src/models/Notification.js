const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  // User who will receive the notification
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // User who triggered the notification (optional)
  sender_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Notification type (e.g., 'GRN_CREATED', 'GRN_APPROVED', 'GRN_REJECTED')
  type: {
    type: String,
    required: true,
    index: true
  },
  
  // Notification title
  title: {
    type: String,
    required: true
  },
  
  // Notification message
  message: {
    type: String,
    required: true
  },
  
  // Whether the notification has been read
  is_read: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // When the notification was read
  read_at: {
    type: Date,
    index: true
  },
  
  // Related entity type (e.g., 'GRN', 'PO')
  entity_type: {
    type: String,
    index: true
  },
  
  // Related entity ID
  entity_id: {
    type: Schema.Types.ObjectId,
    index: true
  },
  
  // Additional metadata (flexible schema)
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      // Remove sensitive/unecessary fields
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for common query patterns
notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });
notificationSchema.index({ entity_type: 1, entity_id: 1 });
notificationSchema.index({ created_at: -1 });

// Virtual for time since creation
notificationSchema.virtual('time_ago').get(function() {
  const now = new Date();
  const diffMs = now - this.created_at;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  if (diffSec < 60) {
    return `${diffSec} second${diffSec === 1 ? '' : 's'} ago`;
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  } else if (diffHr < 24) {
    return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  } else {
    return this.created_at.toLocaleDateString();
  }
});

// Pre-save hook to ensure required fields
notificationSchema.pre('save', function(next) {
  // If marked as read but no read_at is set, set it to now
  if (this.isModified('is_read') && this.is_read && !this.read_at) {
    this.read_at = new Date();
  }
  next();
});

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    user_id: userId,
    is_read: false
  });
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    {
      user_id: userId,
      is_read: false
    },
    {
      $set: {
        is_read: true,
        read_at: new Date()
      }
    }
  );
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
