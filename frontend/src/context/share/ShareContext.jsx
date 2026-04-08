import { useState, useEffect, useContext, useCallback, useRef, createContext } from "react";
import client from "../../api/axios";
import { LoginContext } from "../login/LoginContext";

export const SharesContext = createContext();

const SharesProvider = ({ children }) => {
  const [cuotas, setCuotas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [semesterStats, setSemesterStats] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState("");
  const { auth, authLoading } = useContext(LoginContext);
  const hasFetchedCuotas = useRef(false);
  const hasFetchedStats = useRef(false);
  const sharesByStudentCache = useRef(new Map());

  const buildSharesByStudentCache = useCallback((shares) => {
    const nextCache = new Map();

    (Array.isArray(shares) ? shares : []).forEach((share) => {
      const studentId =
        typeof share.student === "string"
          ? share.student
          : share.student?._id;

      if (!studentId) return;

      if (!nextCache.has(studentId)) {
        nextCache.set(studentId, []);
      }

      nextCache.get(studentId).push(share);
    });

    sharesByStudentCache.current = nextCache;
  }, []);

const obtenerCuotas = useCallback(
  async (force = false) => {
    if (loading || (hasFetchedCuotas.current && !force && cuotas.length > 0)) return;
    if (authLoading || !auth) return;

    setLoading(true);
    try {
      const response = await client.get("/shares");
      const shares = Array.isArray(response.data) ? response.data : [];
      setCuotas(shares);
      buildSharesByStudentCache(shares);
      hasFetchedCuotas.current = true;
    } catch (error) {
      console.error("Error obteniendo cuotas:", error);
      setCuotas([]);
      sharesByStudentCache.current = new Map();
      throw error;
    } finally {
      setLoading(false);
    }
  },
  [loading, authLoading, auth, cuotas.length, buildSharesByStudentCache]
);

  const obtenerCuotasPorSemestre = useCallback(
    async (semester) => {
      if (!semester) return;
      try {
        setLoading(true);
        const response = await client.get("/shares/by-semester", {
          params: { semester },
        });
        setSemesterStats(response.data);
        return response;
      } catch (error) {
        console.error(`Error obteniendo estadísticas para ${semester}:`, error);
        setSemesterStats(null);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const obtenerCuotasPorEstudiante = useCallback(
    async (studentId, options = {}) => {
      const { force = false } = options;

      if (!force && sharesByStudentCache.current.has(studentId)) {
        return sharesByStudentCache.current.get(studentId) || [];
      }

      try {
        const response = await client.get(`/shares/${studentId}`);
        const data = Array.isArray(response.data) ? response.data : [];
        sharesByStudentCache.current.set(studentId, data);
        return data;
      } catch (error) {
        console.error("Error obteniendo cuotas por estudiante:", error);
        throw error;
      }
    },
    []
  );

  const getAvailableShareNames = useCallback(
    async (year, studentId = null) => {
      try {
        const response = await client.get(`/shares/available-names`, {
          params: studentId ? { year, studentId } : { year },
        });
        const data = Array.isArray(response.data) ? response.data : [];
        return data;
      } catch (error) {
        console.error("Error obteniendo nombres disponibles:", error);
        throw error;
      }
    },
    []
  );

  useEffect(() => {
    if (authLoading || !auth) return;

    if (!hasFetchedCuotas.current) {
      obtenerCuotas().catch((error) => {
        console.error("Error en useEffect de SharesContext al obtener cuotas:", error);
      });
    }

    if (selectedSemester && !hasFetchedStats.current) {
      obtenerCuotasPorSemestre(selectedSemester).catch((error) => {
        console.error("Error al cargar estadísticas iniciales:", error);
      });
      hasFetchedStats.current = true;
    } else if (!selectedSemester) {
      setSemesterStats(null);
    }
  }, [auth, authLoading, obtenerCuotas, obtenerCuotasPorSemestre, selectedSemester]);

const addCuota = useCallback(
  async (cuota) => {
    if (!auth || auth !== "admin") {
      return Promise.reject(new Error("No autorizado"));
    }

    try {
      const response = await client.post("/shares/create", cuota);
      const createdShare = response.data.share;

      setCuotas((prevCuotas) => {
        const nextCuotas = [...prevCuotas, createdShare];
        buildSharesByStudentCache(nextCuotas);
        return nextCuotas;
      });

      const studentId =
        typeof createdShare.student === "string"
          ? createdShare.student
          : createdShare.student?._id || cuota.student;

      if (studentId) {
        const cachedShares = sharesByStudentCache.current.get(studentId) || [];
        sharesByStudentCache.current.set(studentId, [...cachedShares, createdShare]);
      }

      return response.data.share;
    } catch (error) {
      console.error("Error al crear la cuota:", error);
      throw error;
    }
  },
  [auth, buildSharesByStudentCache]
);

  const createMassiveShares = useCallback(
    async (paymentName, year) => {
      if (!auth || auth !== "admin") return Promise.reject("No autorizado");
      try {
        const response = await client.post("/shares/create-massive", { paymentName, year });
        await obtenerCuotas(true);
        return response.data.shares.length;
      } catch (error) {
        console.error("Error al crear cuotas masivas:", error);
        throw error;
      }
    },
    [auth, obtenerCuotas]
  );

  const deleteCuota = useCallback(
    async (id) => {
      if (!auth || auth !== "admin") return Promise.reject("No autorizado");
      try {
        await client.delete(`/shares/delete/${id}`);
        setCuotas((prevCuotas) => {
          const nextCuotas = prevCuotas.filter((cuota) => cuota._id !== id);
          buildSharesByStudentCache(nextCuotas);
          return nextCuotas;
        });
        return Promise.resolve();
      } catch (error) {
        console.error("Error al eliminar cuota:", error);
        throw error;
      }
    },
    [auth, buildSharesByStudentCache]
  );

const updateCuota = useCallback(
  async (cuota) => {
    if (!auth || auth !== "admin") {
      return Promise.reject(new Error("No autorizado"));
    }

    try {
      const response = await client.put(`/shares/update/${cuota._id}`, cuota);
      const updatedShare = response.data.share;

      setCuotas((prevCuotas) => {
        const nextCuotas = prevCuotas.map((c) => (c._id === cuota._id ? updatedShare : c));
        buildSharesByStudentCache(nextCuotas);
        return nextCuotas;
      });

      return response.data.share;
    } catch (error) {
      console.error("Error al actualizar cuota:", error);
      throw error;
    }
  },
  [auth, buildSharesByStudentCache]
);

  return (
    <SharesContext.Provider
      value={{
        cuotas,
        loading,
        obtenerCuotas,
        obtenerCuotasPorSemestre,
        obtenerCuotasPorEstudiante,
        addCuota,
        deleteCuota,
        updateCuota,
        createMassiveShares,
        getAvailableShareNames,
        semesterStats,
        setSemesterStats,
        selectedSemester,
        setSelectedSemester,
      }}
    >
      {children}
    </SharesContext.Provider>
  );
};

export default SharesProvider;
