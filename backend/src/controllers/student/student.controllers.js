import Student from '../../models/student/student.model.js';
import Share from '../../models/share/share.model.js';
import cloudinaryV2 from 'cloudinary';
import dotenv from 'dotenv';
import xlsx from 'xlsx';
import axios from 'axios';
import pLimit from 'p-limit';
import { parse, isValid, format } from 'date-fns';
import axiosRetry from 'axios-retry';
import { calculateStudentEnabledStatus, updateStudentEnabledStatus } from '../../utils/student.utils.js';

// Configurar reintentos para axios
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) => error.response?.status === 429 || !error.response,
});

dotenv.config();

cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Función para extraer el public_id de una URL de Cloudinary
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  const studentsIndex = parts.indexOf('students');
  let fileBaseName;
  let folder = '';

  if (studentsIndex !== -1) {
    const folderParts = parts.slice(studentsIndex);
    const fileNameWithPossibleVersion = folderParts.pop();
    if (folderParts[folderParts.length - 1].match(/^v\d+$/)) folderParts.pop();
    fileBaseName = fileNameWithPossibleVersion.split('.')[0];
    folder = folderParts.join('/');
  } else {
    const fileNameWithPossibleVersion = parts.pop();
    const lastPartBeforeFile = parts[parts.length - 1];
    if (lastPartBeforeFile.match(/^v\d+$/)) parts.pop();
    fileBaseName = fileNameWithPossibleVersion.split('.')[0];
  }

  const publicId = folder ? `${folder}/${fileBaseName}` : fileBaseName;
  return publicId;
};

// Función para normalizar fechas a dd/mm/yyyy
const normalizeDate = (dateInput) => {
  if (!dateInput) return '';
  const dateStr = String(dateInput).trim();
  let parsedDate;

  const formats = [
    'yyyy-MM-dd', // 2025-03-24 (desde input tipo date)
    'dd/MM/yyyy', // 24/03/2025
    'dd/M/yyyy',  // 24/3/2025
    'd/MM/yy',    // 3/25/25
    'd/M/yy',     // 3/3/25
    'M/d/yy',     // 3/25/25 (mes/día/año)
    'MM/dd/yy',   // 03/25/25
    'M/d/yyyy',   // 3/25/2025
    'MM/dd/yyyy', // 03/25/2025
    'dd-MM-yyyy', // 24-03-2025
    'dd-M-yyyy',  // 24-3-2025
  ];

  for (const fmt of formats) {
    parsedDate = parse(dateStr, fmt, new Date());
    if (isValid(parsedDate)) break;
  }

  return isValid(parsedDate) ? format(parsedDate, 'dd/MM/yyyy') : dateStr; // Si no es válido, devolver original
};

// Función para subir a Cloudinary
const uploadToCloudinary = async (url, folder, options = {}) => {
  if (!url) return null;

  try {
    let directLink = url;

    // Detectar si la URL es de Google Drive
    if (url.includes('drive.google.com')) {
      const driveId = url.match(/[-\w]{25,}/)?.[0];
      if (!driveId) {
        console.error(`No se pudo extraer el ID de Google Drive de la URL: ${url}`);
        return null;
      }
      // Usar export=download para forzar la descarga del archivo
      directLink = `https://drive.google.com/uc?export=download&id=${driveId}`;
    } else {
    }

    // Descargar la imagen
    const response = await axios.get(directLink, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, como Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    // Verificar que la respuesta sea una imagen
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
      console.error(`La URL ${directLink} no devolvió una imagen. Content-Type: ${contentType}`);
      console.error(`Datos de respuesta: ${response.data.toString().substring(0, 200)}`); // Mostrar los primeros 200 caracteres
      return null;
    }

    // Subir a Cloudinary
    const result = await cloudinaryV2.uploader.upload(
      `data:${contentType || 'image/jpeg'};base64,${Buffer.from(response.data).toString('base64')}`,
      { folder, quality: 'auto', ...options }
    );

    
    return result.secure_url;
  } catch (error) {
    console.error(`Error al procesar la URL ${url}:`, error.message);
    if (error.response) {
      console.error(`Código de estado: ${error.response.status}`);
      console.error(`Datos de respuesta: ${error.response.data ? error.response.data.toString().substring(0, 200) : 'Sin datos'}`);
    }
    return null;
  }
};
// Obtener todos los estudiantes
export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find();
    if (students.length === 0) {
      return res.status(200).json({ message: 'No hay estudiantes disponibles' });
    }
    res.status(200).json(students);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener estudiantes', error: error.message });
  }
};

// Crear un nuevo estudiante
export const createStudent = async (req, res) => {
  try {
    const {
      name, lastName, dni, birthDate, address, motherName, fatherName,
      motherPhone, fatherPhone, category, mail, school, color, sex, status
    } = req.body;

    if (!name || !lastName || !dni || !birthDate || !address || !motherName || 
        !fatherName || !motherPhone || !fatherPhone || !category || !school || !sex || !status) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    let profileImage = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
    let archivedUrls = [];
    let archivedNames = [];

    if (req.files && req.files['profileImage'] && req.files['profileImage'].length > 0) {
      const file = req.files['profileImage'][0];
      const result = await cloudinaryV2.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        { folder: 'students/profile', resource_type: 'image' }
      );
      profileImage = result.secure_url;
    }

    if (req.files && req.files['archived'] && req.files['archived'].length > 0) {
      const archivedFiles = req.files['archived'];
      if (archivedFiles.length > 2) {
        return res.status(400).json({ message: 'Se permiten máximo 2 archivos en archived' });
      }
      for (const file of archivedFiles) {
        const result = await cloudinaryV2.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          { folder: 'students/archived', resource_type: 'image' }
        );
        archivedUrls.push(result.secure_url);
        archivedNames.push(file.originalname);
      }
    }

    const normalizedBirthDate = normalizeDate(birthDate); // Normalizar a dd/mm/yyyy

    const newStudent = await Student.create({
      name, lastName, dni, birthDate: normalizedBirthDate, address, motherName, fatherName,
      motherPhone, fatherPhone, category, mail, school, color, sex, status,
      profileImage, archived: archivedUrls, archivedNames,
    });

    const isEnabled = await calculateStudentEnabledStatus(newStudent._id);
    newStudent.isEnabled = isEnabled;
    await newStudent.save();

    res.status(201).json({
      message: 'El estudiante se agregó exitosamente',
      student: newStudent,
    });
  } catch (error) {
    console.error('Error en createStudent:', error);
    return res.status(500).json({ message: 'Error al crear el estudiante', error: error.message });
  }
};

// Eliminar un estudiante por su ID
export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado', success: false });
    }
    const deletionErrors = [];

    // Eliminar las cuotas asociadas al estudiante
    try {
      const deletedShares = await Share.deleteMany({ student: student._id });
    } catch (shareDeleteError) {
      deletionErrors.push(`Error al eliminar las cuotas asociadas: ${shareDeleteError.message}`);
    } 

    if (student.profileImage && student.profileImage !== 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg') {
      const profileImagePublicId = getPublicIdFromUrl(student.profileImage);
      if (profileImagePublicId) {
        try {
          const result = await cloudinaryV2.uploader.destroy(profileImagePublicId, { resource_type: 'image' });
          if (result.result !== 'ok') {
            deletionErrors.push(`No se pudo eliminar profileImage (${profileImagePublicId}) de Cloudinary: ${result.result}`);
          }
        } catch (deleteError) {
          deletionErrors.push(`Error al eliminar profileImage (${profileImagePublicId}): ${deleteError.message}`);
        }
      } else {
        deletionErrors.push(`No se pudo extraer el public_id de profileImage: ${student.profileImage}`);
      }
    }

    if (student.archived && student.archived.length > 0) {
      const archivedPublicIds = student.archived
        .map(url => getPublicIdFromUrl(url))
        .filter(publicId => publicId);
      if (archivedPublicIds.length > 0) {
        try {
          const result = await cloudinaryV2.api.delete_resources(archivedPublicIds, { resource_type: 'image' });
          const deleted = Object.keys(result.deleted).filter(id => result.deleted[id] === 'deleted');
          const notDeleted = Object.keys(result.deleted).filter(id => result.deleted[id] !== 'deleted');
          if (notDeleted.length > 0) {
            deletionErrors.push(`No se pudieron eliminar algunos archivos archived: ${notDeleted.join(', ')}`);
          }
        } catch (deleteError) {
          deletionErrors.push(`Error al eliminar archived: ${deleteError.message}`);
        }
      }
    }
    // Eliminar el estudiante
    await Student.findByIdAndDelete(req.params.id);

    if (deletionErrors.length > 0) {
      res.status(200).json({
        message: 'Estudiante y cuotas eliminados, pero hubo errores al eliminar archivos de Cloudinary',
        success: true,
        errors: deletionErrors,
      });
    } else {
      res.status(200).json({ message: 'Estudiante, cuotas y archivos asociados eliminados correctamente', success: true });
    }
  } catch (error) {
    console.error('Error en deleteStudent:', error);
    res.status(500).json({ message: 'Error al eliminar el estudiante', error: error.message, success: false });
  }
};

// Actualizar un estudiante por su ID
export const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado', success: false });
    }

    const studentData = { ...req.body };
    const updateErrors = [];

    if (req.files && req.files.profileImage && req.files.profileImage.length > 0) {
      if (student.profileImage && student.profileImage !== 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg') {
        const oldProfileImagePublicId = getPublicIdFromUrl(student.profileImage);
        if (oldProfileImagePublicId) {
          try {
            const result = await cloudinaryV2.uploader.destroy(oldProfileImagePublicId, { resource_type: 'image' });
            if (result.result !== 'ok') {
              updateErrors.push(`No se pudo eliminar la imagen de perfil anterior (${oldProfileImagePublicId}) de Cloudinary: ${result.result}`);
            }
          } catch (deleteError) {
            updateErrors.push(`Error al eliminar profileImage anterior (${oldProfileImagePublicId}): ${deleteError.message}`);
          }
        }
      }

      const file = req.files.profileImage[0];
      if (!file || !file.buffer) {
        return res.status(400).json({ message: 'El archivo profileImage no es válido', success: false });
      }
      try {
        const result = await cloudinaryV2.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          { folder: 'students/profile', width: 100, height: 100, crop: 'fill' }
        );
        studentData.profileImage = result.secure_url;
      } catch (uploadError) {
        console.error('Error al subir profileImage a Cloudinary:', uploadError);
        return res.status(500).json({ message: 'Error al subir la imagen de perfil', success: false });
      }
    }

    if (req.files && req.files.archived && req.files.archived.length > 0) {
      if (student.archived && student.archived.length > 0) {
        const archivedPublicIds = student.archived
          .map(url => getPublicIdFromUrl(url))
          .filter(publicId => publicId);
        if (archivedPublicIds.length > 0) {
          try {
            const result = await cloudinaryV2.api.delete_resources(archivedPublicIds, { resource_type: 'image' });
            const notDeleted = Object.keys(result.deleted).filter(id => result.deleted[id] !== 'deleted');
            if (notDeleted.length > 0) {
              updateErrors.push(`No se pudieron eliminar algunos archivos archived anteriores: ${notDeleted.join(', ')}`);
            }
          } catch (deleteError) {
            updateErrors.push(`Error al eliminar archived anteriores: ${deleteError.message}`);
          }
        }
      }

      const archivedUrls = [];
      const archivedNames = studentData.archivedNames || [];
      for (const file of req.files.archived) {
        if (!file || !file.buffer) {
          updateErrors.push('Uno de los archivos archived no es válido');
          continue;
        }
        try {
          const result = await cloudinaryV2.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            { folder: 'students/archived' }
          );
          archivedUrls.push(result.secure_url);
        } catch (uploadError) {
          updateErrors.push(`Error al subir un archivo archived: ${uploadError.message}`);
        }
      }
      studentData.archived = archivedUrls;
      studentData.archivedNames = archivedNames;
    }

    if (studentData.birthDate) {
      studentData.birthDate = normalizeDate(studentData.birthDate); // Normalizar a dd/mm/yyyy
    }

    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, studentData, { new: true });

    if (updateErrors.length > 0) {
      res.status(200).json({
        message: 'Estudiante actualizado, pero hubo errores al procesar los archivos',
        success: true,
        errors: updateErrors,
        student: updatedStudent,
      });
    } else {
      res.status(200).json({ message: 'Estudiante actualizado correctamente', student: updatedStudent, success: true });
    }
  } catch (error) {
    console.error('Error en updateStudent:', error);
    res.status(500).json({ message: 'Error al actualizar el estudiante', error: error.message, success: false });
  }
};

// Obtener un estudiante por su ID
export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el estudiante', error: error.message });
  }
};

// Importar estudiantes desde Excel
export const importStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ningún archivo Excel', success: false });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false });

    if (worksheet.length === 0) {
      return res.status(400).json({ message: 'El archivo Excel está vacío', success: false });
    }

    const existingDnis = new Set((await Student.find({}, 'dni').lean()).map(s => s.dni));
    const errors = [];
    const importedStudents = [];
    const limit = pLimit(5);
    const imageCache = new Map();

    const uploadToCloudinary = async (url, folder, options = {}) => {
      if (imageCache.has(url)) return imageCache.get(url);

      try {
        const driveId = url.match(/[-\w]{25,}/)?.[0];
        if (!driveId) throw new Error('ID de Google Drive no válido');
        const directLink = `https://drive.google.com/uc?export=view&id=${driveId}`;
        const response = await axios.get(directLink, { responseType: 'arraybuffer', timeout: 15000 });
        const result = await cloudinaryV2.uploader.upload(
          `data:${response.headers['content-type'] || 'image/jpeg'};base64,${Buffer.from(response.data).toString('base64')}`,
          { folder, quality: 'auto', ...options }
        );
        imageCache.set(url, result.secure_url);
        return result.secure_url;
      } catch (error) {
        return null;
      }
    };

    const processRow = async (row, rowIndex) => {
      console.log(`Fila ${rowIndex}:`, row);

      const studentData = {
        name: row['Nombre'] || row['name'],
        lastName: row['Apellido'] || row['lastName'],
        dni: String(row['DNI'] || row['dni'] || ''),
        birthDate: row['Fecha de Nacimiento'] || row['birthDate'],
        address: row['Dirección'] || row['address'],
        motherName: row['Nombre de la Madre'] || row['motherName'],
        fatherName: row['Nombre del Padre'] || row['fatherName'],
        motherPhone: row['Teléfono de la Madre'] || row['motherPhone'],
        fatherPhone: row['Teléfono del Padre'] || row['fatherPhone'],
        category: row['Categoría'] || row['category'],
        mail: row['Email'] || row['mail'],
        school: row['Escuela'] || row['school'],
        color: row['Color'] || row['color'],
        profileImage: row['Imagen de Perfil'] || row['profileImage'],
        archived: row['Documento'] || row['archived'],
        sex: row['Sexo'] || row['sex'],
      };



      // Validar campos obligatorios
      const requiredFields = ['name', 'lastName', 'dni', 'birthDate', 'address', 'motherName', 'fatherName', 'motherPhone', 'fatherPhone', 'category', 'school', 'sex'];
      const missingFields = requiredFields.filter(field => !studentData[field] || String(studentData[field]).trim() === '');
      if (missingFields.length > 0) {
        errors.push(`Fila ${rowIndex}: Faltan campos obligatorios: ${missingFields.join(', ')}`);
        return null;
      }

      // Validar formato de DNI
      if (!/^\d{8,10}$/.test(studentData.dni)) {
        errors.push(`Fila ${rowIndex}: DNI ${studentData.dni} debe contener 8 a 10 dígitos`);
        return null;
      }

      // Validar unicidad de DNI
      if (existingDnis.has(studentData.dni)) {
        errors.push(`Fila ${rowIndex}: El alumno con DNI ${studentData.dni} ya existe`);
        return null;
      }

      // Validar formato de teléfonos
      if (!/^\d{10,15}$/.test(studentData.motherPhone)) {
        errors.push(`Fila ${rowIndex}: El teléfono de la madre (${studentData.motherPhone}) debe tener entre 10 y 15 dígitos`);
        return null;
      }
      if (!/^\d{10,15}$/.test(studentData.fatherPhone)) {
        errors.push(`Fila ${rowIndex}: El teléfono del padre (${studentData.fatherPhone}) debe tener entre 10 y 15 dígitos`);
        return null;
      }

      // Validar formato de email (si existe)
      if (studentData.mail && !/\S+@\S+\.\S+/.test(studentData.mail)) {
        errors.push(`Fila ${rowIndex}: Formato inválido de email (${studentData.mail})`);
        return null;
      }

      // Normalizar birthDate
      if (studentData.birthDate) {
        studentData.birthDate = normalizeDate(studentData.birthDate);
        if (!isValid(parse(studentData.birthDate, 'dd/MM/yyyy', new Date()))) {
          errors.push(`Fila ${rowIndex}: Formato de fecha inválido (${studentData.birthDate})`);
          return null;
        }
      } else {
        errors.push(`Fila ${rowIndex}: La fecha de nacimiento es obligatoria`);
        return null;
      }

      // Validar sex
      if (!['Femenino', 'Masculino'].includes(studentData.sex)) {
        errors.push(`Fila ${rowIndex}: Sexo debe ser 'Femenino' o 'Masculino' (valor recibido: ${studentData.sex})`);
        return null;
      }

      // Procesar profileImage (máximo 1)
      let profileImage = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
      if (studentData.profileImage) {
        const profileImageLinks = typeof studentData.profileImage === 'string'
          ? studentData.profileImage.split(',').map(link => link.trim())
          : Array.isArray(studentData.profileImage)
            ? studentData.profileImage
            : [studentData.profileImage];

        if (profileImageLinks.length > 1) {
          errors.push(`Fila ${rowIndex}: Solo se permite 1 imagen en 'profileImage', se encontraron ${profileImageLinks.length}`);
          return null;
        }

        const result = await uploadToCloudinary(profileImageLinks[0], 'students/profile', {
          width: 100,
          height: 100,
          crop: 'fill',
        });
        if (result) profileImage = result;
        else errors.push(`Fila ${rowIndex}: Error al procesar profileImage`);
      }

      // Procesar archived (máximo 2)
      const archivedUrls = [];
      const archivedNames = [];
      if (studentData.archived) {
        const archivedLinks = typeof studentData.archived === 'string'
          ? studentData.archived.split(',').map(link => link.trim())
          : Array.isArray(studentData.archived)
            ? studentData.archived
            : [studentData.archived];

        if (archivedLinks.length > 2) {
          errors.push(`Fila ${rowIndex}: Solo se permiten hasta 2 imágenes en 'archived', se encontraron ${archivedLinks.length}`);
          return null;
        }

        const uploadTasks = archivedLinks.map(link =>
          limit(async () => {
            const result = await uploadToCloudinary(link, 'students/archived');
            if (result) {
              const driveId = link.match(/[-\w]{25,}/)?.[0] || 'unknown';
              return { url: result, name: driveId };
            }
            errors.push(`Fila ${rowIndex}: Error al procesar archived (${link})`);
            return null;
          })
        );

        const results = await Promise.all(uploadTasks);
        results.forEach(result => {
          if (result) {
            archivedUrls.push(result.url);
            archivedNames.push(result.name);
          }
        });
      }

      // Asignar valores procesados
      studentData.profileImage = profileImage;
      studentData.archived = archivedUrls;
      studentData.archivedNames = archivedNames;

      return studentData;
    };

    const studentPromises = worksheet.map((row, i) => limit(() => processRow(row, i + 2)));
    const results = await Promise.all(studentPromises);
    const validStudents = results.filter(student => student !== null);

    if (validStudents.length > 0) {
      const insertedStudents = await Student.insertMany(validStudents);
      for (const student of insertedStudents) {
        const isEnabled = await calculateStudentEnabledStatus(student._id);
        student.isEnabled = isEnabled;
        await student.save();
      }
      importedStudents.push(...insertedStudents);
    }

    res.status(200).json({
      success: true,
      imported: importedStudents.length,
      errors,
      students: importedStudents,
    });
  } catch (error) {
    console.error('Error en importStudents:', error);
    res.status(500).json({ message: 'Error al procesar el archivo Excel', error: error.message, success: false });
  }
};