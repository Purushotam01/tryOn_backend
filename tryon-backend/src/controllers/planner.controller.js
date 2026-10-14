const plannerService = require('../services/planner.service');

async function listPlannerEntries(req, res, next) {
  try {
    const { date, startDate, endDate } = req.query;
    const entries = await plannerService.listPlannerEntries(req.user.uid, { date, startDate, endDate });
    return res.success(entries);
  } catch (error) {
    next(error);
  }
}

async function addOrUpdatePlannerEntry(req, res, next) {
  try {
    const entry = await plannerService.addOrUpdatePlannerEntry(req.user.uid, req.body);
    return res.success(entry, 'Planner entry saved successfully');
  } catch (error) {
    next(error);
  }
}

async function deletePlannerEntry(req, res, next) {
  try {
    await plannerService.deletePlannerEntry(req.user.uid, req.params.id);
    return res.success({ id: req.params.id }, 'Planner entry deleted successfully');
  } catch (error) {
    next(error);
  }
}

async function buildMyWeek(req, res, next) {
  try {
    const weeklyPlan = await plannerService.buildMyWeek(req.user.uid);
    return res.success(weeklyPlan);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPlannerEntries,
  addOrUpdatePlannerEntry,
  deletePlannerEntry,
  buildMyWeek,
};
