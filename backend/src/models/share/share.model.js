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
    year: { // Nuevo campo para el año
        type: Number,
        required: true,
    },
      amount: {
        type: Number,
        required: false, // Ahora es opcional, se define al registrar el pago
        validate: {
            validator: function(v) {
                // Permitir null/undefined (cuando es opcional) o números >= 0 (incluyendo 0)
                return v == null || (typeof v === 'number' && v >= 0);
            },
            message: 'El monto debe ser mayor o igual a 0'
        }
    },
    paymentDate: {
        type: Date, // Fecha de pago (null si no está pagada)
        required: false,
    },
    paymentMethod: {
        type: String,
        trim: true,
        required: false,
    },
    paymentType: { // Nuevo campo para el tipo de pago
        type: String,
        enum: ['Pago Total', 'Pago Parcial'],
        required: false, // Solo se define al registrar el pago
    },
    status: {
        type: String,
        enum: ['Pendiente', 'Pagado'],
        default: 'Pendiente',
    },
    registeredBy: {
        type: String, // Nombre del usuario que registró el pago
        required: false, // Opcional para cuotas antiguas
    },
}, {
    timestamps: true,
});

const Share = mongoose.model('Share', shareSchema);

export default Share;