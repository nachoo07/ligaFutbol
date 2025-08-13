import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
    },
    dni: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate: {
            validator: (v) => /^\d{8,10}$/.test(v),
            message: "DNI debe contener 8 a 10 dígitos.",
        },
    },
    birthDate: { 
        type: String, 
        required: true 
    },
    address: {
        type: String,
        required: true,
        trim: true,
    },
    motherName: {
        type: String,
        trim: true,
    },
    fatherName: {
        type: String,
        trim: true,
    },
    motherPhone: {
        type: String,
        trim: true,
           validate: {
            validator: function(v) {
                // Solo validar si el campo tiene contenido
                if (!v || v.trim() === '') return true;
                return /^\d{10,15}$/.test(v);
            },
            message: "El número de teléfono de la madre debe tener entre 10 y 15 dígitos.",
        },
    },
        fatherPhone: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                // Solo validar si el campo tiene contenido
                if (!v || v.trim() === '') return true;
                return /^\d{10,15}$/.test(v);
            },
            message: "El número de teléfono del padre debe tener entre 10 y 15 dígitos.",
        },
    }, 
    category: {
        type: String,
        required: true,
        trim: true,
    },
    mail: {
        type: String,
        lowercase: true,
        trim: true,
        validate: {
            validator: (v) => !v || /\S+@\S+\.\S+/.test(v),
            message: "Formato inválido de mail.",
        },
    },
    profileImage: {
        type: String,
        trim: true,
        default: 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg',
    },
    archived: {
        type: [String],
        default: [],
        trim: true,
    },
    school: {
        type: String,
        required: true,
        trim: true,
    },
    color: {
        type: String,
        required: false, // No obligatorio
        trim: true,
    },
    archivedNames: {
        type: [String],
        default: [],
    },
    sex: {
        type: String,
        required: true, // Obligatorio
        enum: ['Femenino', 'Masculino'], // Solo estas opciones
        trim: true,
    },
    status: {
        type: String,
        enum: ['Activo', 'Inactivo'], // Solo estas opciones
        default: 'Activo', // Por defecto "Activo"
        trim: true,
    },
    isEnabled: {
        type: Boolean,
        default: false, // Por defecto, no habilitado hasta evaluar cuotas
    }
}, {
    timestamps: true,
});

const Student = mongoose.model('Student', studentSchema);

export default Student;