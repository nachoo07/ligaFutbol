import mongoose from 'mongoose';

const shareSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  paymentName: {
    type: String,
    required: true,
    trim: true,
  },
  year: {
    type: Number,
    required: true,
    min: 2000,
    max: 2100,
    index: true,
  },
  amount: {
    type: Number,
    required: false,
    default: null,
    validate: {
      validator: function (v) {
        return v == null || (typeof v === 'number' && v >= 0);
      },
      message: 'El monto debe ser mayor o igual a 0',
    },
  },
  paymentDate: {
    type: Date,
    required: false,
    default: null,
  },
  paymentMethod: {
    type: String,
    trim: true,
    required: false,
    default: null,
  },
  paymentType: {
    type: String,
    enum: ['Pago Total', 'Pago Parcial'],
    required: false,
    default: null,
  },
  status: {
    type: String,
    enum: ['Pendiente', 'Pagado'],
    default: 'Pendiente',
  },
  registeredBy: {
    type: String,
    required: false,
    default: null,
    trim: true,
  },
}, {
  timestamps: true,
});

shareSchema.index(
  { student: 1, paymentName: 1, year: 1 },
  { unique: true }
);

const Share = mongoose.model('Share', shareSchema);

export default Share;
