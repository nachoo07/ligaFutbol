import mongoose from 'mongoose';

const shareSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
    },
    paymentName: {
        type: String,
        required: true,
        trim: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    paymentDate: {
        type: Date, // Fecha de pago (null si no está pagada)
    },
    paymentMethod: {
        type: String,
        trim: true,
    },
    status: { // Nuevo campo para estado
        type: String,
        enum: ['Pendiente', 'Pagado'], // Solo estos dos valores
        default: 'Pendiente', // Por defecto, todas las cuotas son Pendiente
    },
}, {
    timestamps: true,
});

const Share = mongoose.model('Share', shareSchema);

export default Share;