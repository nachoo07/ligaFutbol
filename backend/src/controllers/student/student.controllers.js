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
    'dd/MM/yyyy', // 24/03/2025
    'd/MM/yyyy',  // 3/03/2025
    'dd/M/yyyy',  // 24/3/2025
    'd/M/yyyy',   // 3/3/2025
    'yyyy-MM-dd', // 2025-03-24
    'dd-MM-yyyy', // 24-03-2025
    'd-MM-yyyy',  // 3-03-2025
    'dd-M-yyyy',  // 24-3-2025
    'd-M-yyyy',   // 3-3-2025
    // Formatos con años de dos dígitos como última opción
    'dd/MM/yy',   // 24/03/25
    'd/MM/yy',    // 3/03/25
    'dd/M/yy',    // 24/3/25
    'd/M/yy',     // 3/3/25
    'MM/dd/yy',   // 03/25/25
    'M/d/yy',     // 3/25/25
  ];

  for (const fmt of formats) {
    parsedDate = parse(dateStr, fmt, new Date());
    if (isValid(parsedDate)) {
      // Validar que el año esté en un rango razonable (por ejemplo, 1900 hasta el año actual + 1)
      const year = parsedDate.getFullYear();
      const currentYear = new Date().getFullYear();
      if (year >= 1900 && year <= currentYear + 1) {
        break;
      }
    }
  }

  if (isValid(parsedDate)) {
    return format(parsedDate, 'dd/MM/yyyy');
  } else {
    console.warn(`[WARN] Fecha no válida detectada: ${dateStr}`);
    return ''; // Devolver cadena vacía si la fecha no es válida
  }
};

const capitalizeWords = (str) => {
  if (!str) return '';
  return str
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
};

// Función para verificar si un enlace de Google Drive es accesible
const checkGoogleDriveLink = async (url) => {
  try {
    const driveId = url.match(/[-\w]{25,}/)?.[0];
    if (!driveId) {
      console.error(`[ERROR] No se pudo extraer el ID de Google Drive de la URL: ${url}`);
      return false;
    }
    const directLink = `https://drive.google.com/uc?export=download&id=${driveId}`;
    const response = await axios.head(directLink, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, como Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    console.log(`[INFO] Enlace de Google Drive ${url} accesible: ${response.status === 200}`);
    return response.status === 200;
  } catch (error) {
    console.error(`[ERROR] No se pudo acceder al enlace de Google Drive ${url}: ${error.message}`);
    return false;
  }
};

// Función para subir a Cloudinary
const imageCache = new Map();

const uploadToCloudinary = async (url, folder, options = {}) => {
  if (!url) return null;

  // Verificar si la URL ya está en caché
  if (imageCache.has(url)) {
    const cachedUrl = imageCache.get(url);
    console.log(`[CACHE] Usando URL en caché para ${url}: ${cachedUrl}`);
    return cachedUrl;
  }

  try {
    console.log(`[START] Subiendo ${url} a ${folder}`);
    let directLink = url;

    // Detectar si la URL es de Google Drive
    if (url.includes('drive.google.com')) {
      const driveId = url.match(/[-\w]{25,}/)?.[0];
      if (!driveId) {
        throw new Error(`No se pudo extraer el ID de Google Drive de la URL: ${url}`);
      }
      directLink = `https://drive.google.com/uc?export=download&id=${driveId}`;

      // Verificar si el enlace de Google Drive es accesible
      const isAccessible = await checkGoogleDriveLink(url);
      if (!isAccessible) {
        throw new Error(`El enlace de Google Drive no es accesible: ${url}`);
      }
    }

    // Descargar la imagen
    console.log(`[DOWNLOAD] Descargando imagen desde ${directLink}`);
    const response = await axios.get(directLink, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, como Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    // Verificar que la respuesta sea una imagen
    const contentType = response.headers['content-type'];
    const buffer = Buffer.from(response.data);

    // Detección de formato por magic numbers
    const magicNumbers = buffer.toString('hex', 0, 4).toUpperCase();
    const firstBytesUtf8 = buffer.toString('utf8', 0, 12);

    let detectedMimeType;
    if (magicNumbers === 'FFD8FF') {
      detectedMimeType = 'image/jpeg'; // JPEG
    } else if (magicNumbers === '89504E47') {
      detectedMimeType = 'image/png'; // PNG
    } else if (firstBytesUtf8.includes('ftypheic') || firstBytesUtf8.includes('ftypmif1')) {
      detectedMimeType = 'image/heic'; // HEIC/HEIF
    } else if (magicNumbers === '47494638') {
      detectedMimeType = 'image/gif'; // GIF
    } else if (magicNumbers === '424D') {
      detectedMimeType = 'image/bmp'; // BMP
    } else if (magicNumbers === '49492A00' || magicNumbers === '4D4D002A') {
      detectedMimeType = 'image/tiff'; // TIFF
    } else if (firstBytesUtf8.includes('RIFF') && buffer.toString('utf8', 8, 12) === 'WEBP') {
      detectedMimeType = 'image/webp'; // WEBP
    }

    // Validar si es imagen
    const validImageTypes = [
      'image/jpeg', 'image/png', 'image/heic', 'image/gif',
      'image/bmp', 'image/tiff', 'image/webp'
    ];

    const isValidImage = detectedMimeType || (contentType && validImageTypes.includes(contentType));
    if (!isValidImage) {
      console.error(`La URL ${directLink} no devolvió una imagen válida. Content-Type: ${contentType}, Magic Numbers: ${magicNumbers}`);
      console.error(`Datos de respuesta: ${buffer.toString('utf8', 0, 200)}`);
      throw new Error(`La URL ${directLink} no devolvió una imagen válida. Content-Type: ${contentType}`);
    }

    // Usar el tipo detectado o el Content-Type si es válido, fallback a image/jpeg
    const mimeType = detectedMimeType || (validImageTypes.includes(contentType) ? contentType : 'image/jpeg');
    console.log(`Tipo de imagen detectado: ${mimeType}`);

    // Subir a Cloudinary
    const uploadOptions = {
      folder,
      quality: 'auto',
      resource_type: 'image',
      ...options,
    };
    console.log(`[UPLOAD] Subiendo a Cloudinary con opciones: ${JSON.stringify(uploadOptions)}`);
    const result = await cloudinaryV2.uploader.upload(
      `data:${mimeType};base64,${buffer.toString('base64')}`,
      uploadOptions
    );

    if (!result.secure_url) {
      throw new Error('No se devolvió una secure_url después de subir la imagen');
    }

    console.log(`[SUCCESS] Subida: ${result.secure_url}`);
    imageCache.set(url, result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error(`[ERROR] Fallo en ${url}: ${error.message}`);
    if (error.response) {
      console.error(`Código de estado: ${error.response.status}`);
      console.error(`Datos de respuesta: ${error.response.data ? error.response.data.toString().substring(0, 200) : 'Sin datos'}`);
    }
    throw error; // Lanzar el error para que se maneje en el llamador
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
    imageCache.clear();
    console.log('[INFO] imageCache limpiado al inicio de createStudent');

    const {
      name, lastName, dni, birthDate, address, motherName, fatherName,
      motherPhone, fatherPhone, category, mail, school, color, sex, status
    } = req.body;

    const normalizedData = {
      name: capitalizeWords(name),
      lastName: capitalizeWords(lastName),
      dni,
      birthDate: normalizeDate(birthDate),
      address: capitalizeWords(address),
      motherName: capitalizeWords(motherName),
      fatherName: capitalizeWords(fatherName),
      motherPhone,
      fatherPhone,
      category: capitalizeWords(category),
      mail,
      school: capitalizeWords(school),
      color: capitalizeWords(color),
      sex: capitalizeWords(sex),
      status: capitalizeWords(status),
    };

    const requiredFields = ['name', 'lastName', 'dni', 'birthDate', 'address', 'category', 'school', 'sex'];
    const missingFields = requiredFields.filter(field => !normalizedData[field] || String(normalizedData[field]).trim() === '');
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Faltan campos obligatorios: ${missingFields.join(', ')}` });
    }

    let profileImage = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
    let archivedUrls = [];
    let archivedNames = [];

    if (req.files && req.files['profileImage'] && req.files['profileImage'].length > 0) {
      const file = req.files['profileImage'][0];
      const publicId = `students/profile/${normalizedData.dni}`;
      try {
        const result = await cloudinaryV2.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          { public_id: publicId, resource_type: 'image', overwrite: true, invalidate: true }
        );
        if (!result.secure_url) {
          throw new Error('Fallo al subir profileImage: secure_url no devuelto');
        }
        profileImage = result.secure_url;
      } catch (error) {
        console.error('Error al subir profileImage:', error);
        return res.status(500).json({ message: `Error al subir profileImage: ${error.message}`, success: false });
      }
    }

    if (req.files && req.files['archived'] && req.files['archived'].length > 0) {
      const archivedFiles = req.files['archived'];
      if (archivedFiles.length > 2) {
        return res.status(400).json({ message: 'Se permiten máximo 2 archivos en archived' });
      }
      for (let i = 0; i < archivedFiles.length; i++) {
        const file = archivedFiles[i];
        const publicId = `students/archived/${normalizedData.dni}/${i}`;
        try {
          const result = await cloudinaryV2.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            { public_id: publicId, resource_type: 'image', overwrite: true, invalidate: true }
          );
          if (!result.secure_url) {
            throw new Error(`Fallo al subir archived[${i}]: secure_url no devuelto`);
          }
          archivedUrls.push(result.secure_url);
          archivedNames.push(file.originalname);
        } catch (error) {
          console.error(`Error al subir archived[${i}]:`, error);
          return res.status(500).json({ message: `Error al subir archived[${i}]: ${error.message}`, success: false });
        }
      }
    }

    const newStudent = await Student.create({
      ...normalizedData,
      profileImage,
      archived: archivedUrls,
      archivedNames,
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
    if (error.code === 11000) { // Error de clave duplicada
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: `${field} duplicado: ${error.keyValue[field]}` });
    }
    if (error.name === 'ValidationError') {
      const validationErrors = Object.entries(error.errors).map(([field, err]) => {
        if (err.kind === 'required') {
          return `${field} es obligatorio`;
        } else if (err.kind === 'enum') {
          return `${field} debe ser ${err.enumValues.map(v => `"${v}"`).join(' o ')}`;
        }
        return err.message;
      });
      return res.status(400).json({ message: `Errores de validación: ${validationErrors.join('; ')}` });
    }
    return res.status(500).json({ message: `Error al crear el estudiante: ${error.message}` });
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
      await Share.deleteMany({ student: student._id });
    } catch (shareDeleteError) {
      deletionErrors.push(`Error al eliminar las cuotas asociadas: ${shareDeleteError.message}`);
    }

    // Eliminar profileImage de Cloudinary
    if (student.profileImage && student.profileImage !== 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg') {
      const profileImagePublicId = getPublicIdFromUrl(student.profileImage);
      if (profileImagePublicId) {
        try {
          const result = await cloudinaryV2.uploader.destroy(profileImagePublicId, { resource_type: 'image' });
          if (result.result !== 'ok' && result.result !== 'not found') {
            deletionErrors.push(`No se pudo eliminar profileImage (${profileImagePublicId}) de Cloudinary: ${result.result}`);
          }
        } catch (deleteError) {
          deletionErrors.push(`Error al eliminar profileImage (${profileImagePublicId}): ${deleteError.message}`);
        }
      } else {
        deletionErrors.push(`No se pudo extraer el public_id de profileImage: ${student.profileImage}`);
      }
    }

    // Eliminar archived de Cloudinary
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

    // Limpiar los campos profileImage y archived antes de eliminar el estudiante
    await Student.findByIdAndUpdate(req.params.id, {
      $set: {
        profileImage: 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg',
        archived: [],
        archivedNames: [],
      }
    });

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
    imageCache.clear();
    console.log('[INFO] imageCache limpiado al inicio de updateStudent');

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado', success: false });
    }

    // Normalizar los datos recibidos
    const studentData = { ...req.body };

    // Excluir isEnabled del frontend, ya que se calcula en el backend
    if (studentData.isEnabled !== undefined) {
      delete studentData.isEnabled;
    }

    const updateErrors = [];

    // Depuración: inspeccionar datos recibidos
    console.log('[INFO] req.body:', req.body);
    console.log('[INFO] req.files:', req.files);

    // Manejar profileImage
    if (req.files && req.files.profileImage && req.files.profileImage.length > 0) {
      // Eliminar imagen de perfil anterior si existe
      if (student.profileImage && student.profileImage !== 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg') {
        const oldProfileImagePublicId = getPublicIdFromUrl(student.profileImage);
        if (oldProfileImagePublicId) {
          try {
            const result = await cloudinaryV2.uploader.destroy(oldProfileImagePublicId, { resource_type: 'image' });
            if (result.result !== 'ok' && result.result !== 'not found') {
              updateErrors.push(`No se pudo eliminar la imagen de perfil anterior (${oldProfileImagePublicId}): ${result.result}`);
            }
          } catch (deleteError) {
            updateErrors.push(`Error al eliminar profileImage anterior (${oldProfileImagePublicId}): ${deleteError.message}`);
          }
        }
      }

      const file = req.files.profileImage[0];
      if (!file || !file.buffer) {
        updateErrors.push('El archivo profileImage no es válido');
      } else {
        try {
          const publicId = `students/profile/${student.dni}`;
          const result = await cloudinaryV2.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            { public_id: publicId, resource_type: 'image', overwrite: true, invalidate: true, width: 100, height: 100, crop: 'fill' }
          );
          if (!result.secure_url) {
            throw new Error('Fallo al subir profileImage: secure_url no devuelto');
          }
          studentData.profileImage = result.secure_url;
        } catch (uploadError) {
          console.error('Error al subir profileImage a Cloudinary:', uploadError);
          updateErrors.push(`Error al subir la imagen de perfil: ${uploadError.message}`);
        }
      }
    }

    // Manejar archived
    let archivedUrls = [];
    let archivedNames = [];

    // Procesar URLs existentes
    let existingArchived = [];
    if (req.body.existingArchived) {
      existingArchived = Array.isArray(req.body.existingArchived)
        ? req.body.existingArchived
        : [req.body.existingArchived];
      existingArchived = existingArchived.filter(url => url && url.startsWith('http'));
    }

    // Usar existingArchived como base, no combinar con student.archived
    archivedUrls = [...existingArchived].slice(0, 2);

    // Procesar archivedNames
    if (req.body.archivedNames) {
      try {
        archivedNames = JSON.parse(req.body.archivedNames);
        if (!Array.isArray(archivedNames)) {
          throw new Error('archivedNames debe ser un arreglo');
        }
      } catch (error) {
        updateErrors.push(`Error al procesar archivedNames: ${error.message}`);
        archivedNames = student.archivedNames || [];
      }
    } else {
      archivedNames = student.archivedNames || [];
    }

    // Si se envían nuevos archivos adjuntos
    if (req.files && req.files.archived && req.files.archived.length > 0) {
      // Validar límite de 2 archivos
      const totalFiles = archivedUrls.length + req.files.archived.length;
      if (totalFiles > 2) {
        return res.status(400).json({
          message: `Se permiten máximo 2 archivos en archived. Actualmente hay ${archivedUrls.length} archivo(s) existente(s).`,
          success: false
        });
      }

      // Subir nuevos archivos
      const newUrls = [];
      for (let i = 0; i < req.files.archived.length; i++) {
        const file = req.files.archived[i];
        if (!file || !file.buffer) {
          updateErrors.push(`El archivo archived[${i}] no es válido`);
          continue;
        }
        try {
          const publicId = `students/archived/${student.dni}/${Date.now()}-${i}`;
          const result = await cloudinaryV2.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            { public_id: publicId, resource_type: 'image', overwrite: true, invalidate: true }
          );
          if (!result.secure_url) {
            throw new Error(`Fallo al subir archived[${i}]: secure_url no devuelto`);
          }
          newUrls.push(result.secure_url);
          // Añadir el nombre del archivo nuevo al índice correcto
          const targetIndex = archivedUrls.length + i;
          archivedNames[targetIndex] = file.originalname || `Archivo ${targetIndex + 1}`;
        } catch (uploadError) {
          updateErrors.push(`Error al subir un archivo archived: ${uploadError.message}`);
        }
      }

      // Combinar URLs nuevas con existentes
      archivedUrls = [...archivedUrls, ...newUrls].slice(0, 2);
    } else if (req.body.archived && JSON.parse(req.body.archived).length === 0) {
      // Si se envía archived como arreglo vacío, limpiar todo
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
      archivedUrls = [];
      archivedNames = [];
    }

    // Eliminar archivos de Cloudinary que ya no están en archivedUrls
    if (student.archived && student.archived.length > 0) {
      const currentPublicIds = student.archived
        .map(url => getPublicIdFromUrl(url))
        .filter(publicId => publicId);
      const newPublicIds = archivedUrls
        .map(url => getPublicIdFromUrl(url))
        .filter(publicId => publicId);
      const publicIdsToDelete = currentPublicIds.filter(id => !newPublicIds.includes(id));
      if (publicIdsToDelete.length > 0) {
        try {
          const result = await cloudinaryV2.api.delete_resources(publicIdsToDelete, { resource_type: 'image' });
          const notDeleted = Object.keys(result.deleted).filter(id => result.deleted[id] !== 'deleted');
          if (notDeleted.length > 0) {
            updateErrors.push(`No se pudieron eliminar algunos archivos archived anteriores: ${notDeleted.join(', ')}`);
          }
        } catch (deleteError) {
          updateErrors.push(`Error al eliminar archived anteriores: ${deleteError.message}`);
        }
      }
    }

    studentData.archived = archivedUrls;
    studentData.archivedNames = archivedNames;

    // Normalizar campos de texto
    if (studentData.name) studentData.name = capitalizeWords(studentData.name);
    if (studentData.lastName) studentData.lastName = capitalizeWords(studentData.lastName);
    if (studentData.address) studentData.address = capitalizeWords(studentData.address);
    if (studentData.motherName) studentData.motherName = capitalizeWords(studentData.motherName);
    if (studentData.fatherName) studentData.fatherName = capitalizeWords(studentData.fatherName);
    if (studentData.category) studentData.category = capitalizeWords(studentData.category);
    if (studentData.school) studentData.school = capitalizeWords(studentData.school);
    if (studentData.color) studentData.color = capitalizeWords(studentData.color);
    if (studentData.sex) studentData.sex = capitalizeWords(studentData.sex);
    if (studentData.status) studentData.status = capitalizeWords(studentData.status);
    if (studentData.birthDate) studentData.birthDate = normalizeDate(studentData.birthDate);

    // Validar campos obligatorios
    const requiredFields = ['name', 'lastName', 'dni', 'birthDate', 'address', 'category', 'school', 'sex'];
    const missingFields = requiredFields.filter(field => !studentData[field] || String(studentData[field]).trim() === '');
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Faltan campos obligatorios: ${missingFields.join(', ')}`, success: false });
    }

    // Depuración: inspeccionar studentData antes de actualizar
    console.log('[INFO] studentData para actualizar:', studentData);

    // Actualizar el estudiante
    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, studentData, { new: true, runValidators: true });

    // Recalcular isEnabled después de la actualización
    const isEnabled = await calculateStudentEnabledStatus(updatedStudent._id);
    updatedStudent.isEnabled = isEnabled;
    await updatedStudent.save();

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
    if (error.name === 'ValidationError') {
      const validationErrors = Object.entries(error.errors).map(([field, err]) => {
        if (err.kind === 'required') {
          return `${field} es obligatorio`;
        } else if (err.kind === 'enum') {
          return `${field} debe ser ${err.enumValues.map(v => `"${v}"`).join(' o ')}`;
        } else if (err.kind === 'CastError') {
          return `Valor inválido para ${field}: ${err.value}`;
        }
        return err.message;
      });
      return res.status(400).json({ message: `Errores de validación: ${validationErrors.join('; ')}`, success: false });
    }
    return res.status(500).json({ message: `Error al actualizar el estudiante: ${error.message}`, success: false });
  }
};



// Obtener un estudiante por su ID
export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    res.status(200).json(student); // Usar 200 para consistencia con otros endpoints exitosos
  } catch (error) {
    console.error(`[ERROR] Error al obtener el estudiante con ID ${req.params.id}: ${error.message}`);
    res.status(500).json({ message: 'Error al obtener el estudiante', error: error.message });
  }
};

// Importar estudiantes desde Excel
export const importStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ningún archivo Excel', success: false });
    }

    // Limpiar imageCache al inicio de la operación
    imageCache.clear();
    console.log('[INFO] imageCache limpiado al inicio de importStudents');

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

    const processRow = async (row, rowIndex) => {
      try {
        console.log(`Fila ${rowIndex}:`, row);

        const studentData = {
          name: capitalizeWords(row['Nombre'] || row['name']),
          lastName: capitalizeWords(row['Apellido'] || row['lastName']),
          dni: String(row['DNI'] || row['dni'] || ''),
          birthDate: row['Fecha de Nacimiento'] || row['birthDate'],
          address: capitalizeWords(row['Dirección'] || row['address']),
          motherName: capitalizeWords(row['Nombre de la Madre'] || row['motherName']),
          fatherName: capitalizeWords(row['Nombre del Padre'] || row['fatherName']),
          motherPhone: row['Teléfono de la Madre'] || row['motherPhone'],
          fatherPhone: row['Teléfono del Padre'] || row['fatherPhone'],
          category: capitalizeWords(row['Categoría'] || row['category']),
          mail: row['Email'] || row['mail'],
          school: capitalizeWords(row['Escuela'] || row['school']),
          color: capitalizeWords(row['Color'] || row['color']),
          profileImage: row['Imagen de Perfil'] || row['profileImage'],
          archived: row['Documento'] || row['archived'],
          sex: capitalizeWords(row['Sexo'] || row['sex']),
          status: row['Estado'] || row['status'] || 'Activo', // Valor por defecto si no se proporciona
        };

        // Validar campos obligatorios
        const requiredFields = ['name', 'lastName', 'dni', 'birthDate', 'address', 'motherName', 'fatherName', 'motherPhone', 'fatherPhone', 'category', 'school', 'sex', 'status'];
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
          if (!studentData.birthDate || !isValid(parse(studentData.birthDate, 'dd/MM/yyyy', new Date()))) {
            errors.push(`Fila ${rowIndex}: Formato de fecha inválido (${row['Fecha de Nacimiento'] || row['birthDate']})`);
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

        // Validar status
        if (!['Activo', 'Inactivo'].includes(studentData.status)) {
          errors.push(`Fila ${rowIndex}: Estado debe ser 'Activo' o 'Inactivo' (valor recibido: ${studentData.status})`);
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

          console.log(`[START] Subiendo profileImage para fila ${rowIndex}: ${profileImageLinks[0]}`);
          const publicId = `students/profile/${studentData.dni}`; // Definir publicId usando el dni
          try {
            const result = await uploadToCloudinary(profileImageLinks[0], 'students/profile', {
              public_id: publicId,
              overwrite: true,
              invalidate: true,
              width: 100,
              height: 100,
              crop: 'fill',
            });
            if (!result) {
              throw new Error('No se devolvió una URL válida');
            }
            profileImage = result;
            console.log(`[SUCCESS] ProfileImage subido: ${result}`);
          } catch (uploadError) {
            errors.push(`Fila ${rowIndex}: Error al procesar profileImage: ${uploadError.message}`);
            console.log(`[ERROR] Fallo al subir profileImage: ${profileImageLinks[0]} - ${uploadError.message}`);
            return null; // No continuar si falla la subida de profileImage
          }
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

          for (let i = 0; i < archivedLinks.length; i++) {
            const link = archivedLinks[i];
            console.log(`[START] Subiendo archived para fila ${rowIndex}: ${link}`);
            const publicId = `students/archived/${studentData.dni}/${i}`; // Definir publicId usando el dni
            try {
              const result = await uploadToCloudinary(link, 'students/archived', {
                public_id: publicId,
                overwrite: true,
                invalidate: true,
              });
              if (!result) {
                throw new Error('No se devolvió una URL válida');
              }
              const driveId = link.match(/[-\w]{25,}/)?.[0] || 'unknown';
              archivedUrls.push(result);
              archivedNames.push(driveId);
              console.log(`[SUCCESS] Archived subido: ${result}`);
            } catch (uploadError) {
              errors.push(`Fila ${rowIndex}: Error al procesar archived (${link}): ${uploadError.message}`);
              console.log(`[ERROR] Fallo al subir archived: ${link} - ${uploadError.message}`);
              return null; // No continuar si falla la subida de archived
            }
          }
        }

        // Asignar valores procesados
        studentData.profileImage = profileImage;
        studentData.archived = archivedUrls;
        studentData.archivedNames = archivedNames;

        console.log(`[END] Fila ${rowIndex} procesada`);
        return studentData;
      } catch (error) {
        console.error(`[ERROR] Fila ${rowIndex} falló: ${error.message}`);
        errors.push(`Fila ${rowIndex}: Error inesperado (${error.message})`);
        return null;
      }
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