import Motion from '../../models/motion/motion.model.js';

export const createMotion = async (req, res) => {
  try {
    const { concept, date, amount, paymentMethod, incomeType } = req.body;
    const newMotion = new Motion({ concept, date, amount, paymentMethod, incomeType });
    await newMotion.save();
    res.status(201).json(newMotion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMotions = async (req, res) => {
  try {
    const motions = await Motion.find();
    res.status(200).json(motions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { concept, date, amount, paymentMethod, incomeType } = req.body;
    const updatedMotion = await Motion.findByIdAndUpdate(
      id,
      { concept, date, amount, paymentMethod, incomeType },
      { new: true }
    );
    if (!updatedMotion) {
      return res.status(404).json({ message: 'Motion not found' });
    }
    res.status(200).json(updatedMotion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMotion = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMotion = await Motion.findByIdAndDelete(id);
    if (!deletedMotion) {
      return res.status(404).json({ message: 'Motion not found' });
    }
    res.status(200).json({ message: 'Motion deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMotionsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const motions = await Motion.find({
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    }).select('paymentMethod date amount incomeType');
    if (motions.length === 0) {
      return res.status(200).json({ message: "No hay movimientos disponibles para esta fecha" });
    }
    res.status(200).json(motions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMotionsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    const motions = await Motion.find({
      date: {
        $gte: start,
        $lt: end,
      },
    }).select('paymentMethod date amount incomeType');
    if (motions.length === 0) {
      return res.status(200).json({ message: "No hay movimientos disponibles para este rango de fechas" });
    }
    res.status(200).json(motions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



