import Motion from '../../models/motion/motion.model.js';

const parseLocalDate = (value) => {
  if (!value) return null;

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDayRange = (value) => {
  const start = parseLocalDate(value);
  if (!start) return null;

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

const getRangeBounds = (startValue, endValue) => {
  const start = parseLocalDate(startValue);
  const endStart = parseLocalDate(endValue);

  if (!start || !endStart) return null;

  const end = new Date(endStart);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

export const createMotion = async (req, res) => {
  try {
    const { concept, date, amount, paymentMethod, incomeType } = req.body;
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Fecha inválida' });
    }

    const newMotion = new Motion({
      concept,
      date: parsedDate,
      amount,
      paymentMethod,
      incomeType,
    });

    await newMotion.save();
    return res.status(201).json(newMotion);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMotions = async (req, res) => {
  try {
    const motions = await Motion.find().sort({ date: -1, createdAt: -1 });
    return res.status(200).json(motions);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateMotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { concept, date, amount, paymentMethod, incomeType } = req.body;
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Fecha inválida' });
    }

    const updatedMotion = await Motion.findByIdAndUpdate(
      id,
      { concept, date: parsedDate, amount, paymentMethod, incomeType },
      { new: true, runValidators: true }
    );

    if (!updatedMotion) {
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }

    return res.status(200).json(updatedMotion);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteMotion = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMotion = await Motion.findByIdAndDelete(id);

    if (!deletedMotion) {
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }

    return res.status(200).json({ message: 'Movimiento eliminado correctamente' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMotionsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const range = getDayRange(date);

    if (!range) {
      return res.status(400).json({ message: 'Fecha inválida' });
    }

    const motions = await Motion.find({
      date: {
        $gte: range.start,
        $lt: range.end,
      },
    })
      .select('paymentMethod date amount incomeType concept')
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json(motions);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMotionsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const bounds = getRangeBounds(startDate, endDate);

    if (!bounds) {
      return res.status(400).json({ message: 'Rango de fechas inválido' });
    }

    const motions = await Motion.find({
      date: {
        $gte: bounds.start,
        $lt: bounds.end,
      },
    })
      .select('paymentMethod date amount incomeType concept')
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json(motions);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
