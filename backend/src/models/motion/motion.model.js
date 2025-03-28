import mongoose from 'mongoose';

const motionSchema = new mongoose.Schema({
  concept: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['efectivo', 'transferencia'],
  },
  incomeType: {
    type: String,
    required: true,
    enum: ['ingreso', 'egreso'],
  },
}, {
  timestamps: true,
});

const Motion = mongoose.model('Motion', motionSchema);

export default Motion;