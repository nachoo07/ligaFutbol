import mongoose from 'mongoose';
import { connectDB } from '../src/db/db.connection.js';
import Student from '../src/models/student/student.model.js';

const VALID_STATUSES = ['Activo', 'Inactivo'];

const parseArgs = (args) => args.reduce((parsed, arg, index) => {
    if (arg === '--apply') {
        parsed.apply = true;
        return parsed;
    }

    if (arg === '--list-schools') {
        parsed.listSchools = true;
        return parsed;
    }

    if (arg.startsWith('--schools=')) {
        parsed.schools = arg.replace('--schools=', '');
        return parsed;
    }

    if (arg === '--schools') {
        parsed.schools = args[index + 1] || '';
        return parsed;
    }

    if (arg.startsWith('--status=')) {
        parsed.status = arg.replace('--status=', '');
        return parsed;
    }

    if (arg === '--status') {
        parsed.status = args[index + 1] || '';
        return parsed;
    }

    return parsed;
}, {
    apply: false,
    listSchools: false,
    schools: '',
    status: 'Inactivo',
});

const splitSchools = (schools) => schools
    .split(',')
    .map((school) => school.trim())
    .filter(Boolean);

const printUsage = () => {
    console.log(`
Uso:
  node scripts/updateStudentsStatusBySchool.js --list-schools
  node scripts/updateStudentsStatusBySchool.js --schools "Escuela 1,Escuela 2" --status Inactivo
  node scripts/updateStudentsStatusBySchool.js --schools "Escuela 1,Escuela 2" --status Inactivo --apply

Notas:
  - Sin --apply no modifica datos, solo muestra el resumen.
  - Los nombres de escuelas deben coincidir exactamente con la base.
  - Status validos: Activo, Inactivo.
`);
};

const listSchools = async () => {
    const schools = await Student.aggregate([
        {
            $group: {
                _id: '$school',
                total: { $sum: 1 },
                activos: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'Activo'] }, 1, 0],
                    },
                },
                inactivos: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'Inactivo'] }, 1, 0],
                    },
                },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    if (schools.length === 0) {
        console.log('No hay escuelas cargadas.');
        return;
    }

    console.log('Escuelas encontradas:');
    schools.forEach((school) => {
        console.log(`- ${school._id || 'Sin escuela'}: ${school.total} total | ${school.activos} activos | ${school.inactivos} inactivos`);
    });
};

const buildBackup = (students, nextStatus) => ({
    createdAt: new Date().toISOString(),
    nextStatus,
    total: students.length,
    students: students.map((student) => ({
        _id: student._id,
        name: student.name,
        lastName: student.lastName,
        dni: student.dni,
        school: student.school,
        previousStatus: student.status,
    })),
});

const updateStudents = async ({ schools, status, apply }) => {
    if (!VALID_STATUSES.includes(status)) {
        throw new Error(`Status invalido: ${status}. Usar: ${VALID_STATUSES.join(', ')}`);
    }

    const schoolNames = splitSchools(schools);
    if (schoolNames.length === 0) {
        printUsage();
        throw new Error('Debes indicar al menos una escuela con --schools.');
    }

    const fromStatus = status === 'Inactivo' ? 'Activo' : 'Inactivo';
    const students = await Student.find({
        school: { $in: schoolNames },
        status: fromStatus,
    }).select('_id name lastName dni school status').lean();

    const grouped = schoolNames.map((school) => ({
        school,
        count: students.filter((student) => student.school === school).length,
    }));

    console.log(`Cambio solicitado: ${fromStatus} -> ${status}`);
    console.log(`Modo: ${apply ? 'APLICAR CAMBIOS' : 'PRUEBA / DRY-RUN'}`);
    console.log('');
    grouped.forEach((group) => {
        console.log(`- ${group.school}: ${group.count} alumnos a modificar`);
    });
    console.log(`Total a modificar: ${students.length}`);

    const notFoundSchools = grouped
        .filter((group) => group.count === 0)
        .map((group) => group.school);

    if (notFoundSchools.length > 0) {
        console.log('');
        console.log('Sin alumnos para modificar en:');
        notFoundSchools.forEach((school) => console.log(`- ${school}`));
    }

    if (!apply) {
        console.log('');
        console.log('No se aplicaron cambios. Agrega --apply para ejecutar la actualizacion.');
        return;
    }

    if (students.length === 0) {
        console.log('No hay alumnos para modificar.');
        return;
    }

    console.log('');
    console.log('Backup JSON:');
    console.log(JSON.stringify(buildBackup(students, status), null, 2));
    console.log('');

    const result = await Student.updateMany(
        {
            _id: { $in: students.map((student) => student._id) },
            status: fromStatus,
        },
        { $set: { status } },
    );

    console.log(`Cambios aplicados: ${result.modifiedCount} alumnos actualizados.`);
};

const main = async () => {
    const options = parseArgs(process.argv.slice(2));

    await connectDB();

    if (options.listSchools) {
        await listSchools();
        return;
    }

    await updateStudents(options);
};

main()
    .catch((error) => {
        console.error(`Error: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
