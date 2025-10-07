const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  seq: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '90d' // Auto-delete counters older than 90 days
  }
}, {
  timestamps: true
});

// Compound index for better query performance
counterSchema.index({ name: 1, seq: 1 });

// Prevent duplicate counter names
counterSchema.index({ name: 1 }, { unique: true });

// Add a pre-save hook to ensure the counter is never less than 1
counterSchema.pre('save', function(next) {
  if (this.seq < 0) {
    this.seq = 0;
  }
  next();
});

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
