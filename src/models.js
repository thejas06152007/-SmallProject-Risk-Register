const mongoose = require('mongoose');

const riskSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    title: { type: String, required: [true, 'Risk title is required.'], trim: true, maxlength: 120 },
    desc: { type: String, default: '', trim: true, maxlength: 400 },
    cat: {
      type: String,
      enum: { values: ['Schedule', 'Scope', 'People', 'Technical', 'Budget', 'External', 'Other'], message: 'Unknown category.' },
      default: 'Other'
    },
    l: { type: Number, required: [true, 'Likelihood is required.'], min: [1, 'Likelihood must be 1 to 5.'], max: [5, 'Likelihood must be 1 to 5.'], validate: { validator: Number.isInteger, message: 'Likelihood must be a whole number.' } },
    i: { type: Number, required: [true, 'Impact is required.'], min: [1, 'Impact must be 1 to 5.'], max: [5, 'Impact must be 1 to 5.'], validate: { validator: Number.isInteger, message: 'Impact must be a whole number.' } },
    mit: { type: String, required: [true, 'Mitigation is required.'], trim: true, maxlength: 400 },
    owner: { type: String, required: [true, 'Owner is required.'], trim: true, maxlength: 60 },
    review: { type: String, required: [true, 'Review date is required.'], match: [/^\d{4}-\d{2}-\d{2}$/, 'Review date must look like 2026-11-30.'] },
    status: {
      type: String,
      enum: { values: ['Open', 'Mitigating', 'Closed'], message: 'Status must be Open, Mitigating or Closed.' },
      default: 'Open'
    },
    example: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Counter documents: 'risk' numbers the risks (R-01, R-02...), 'seeded' marks that examples were loaded once.
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });

const Risk = mongoose.models.Risk || mongoose.model('Risk', riskSchema);
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

module.exports = { Risk, Counter };
