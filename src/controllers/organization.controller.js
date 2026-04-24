const Organization = require('../models/Organization');
const { success, paginated, error } = require('../utils/apiResponse');
const { generateSlug } = require('../utils/slugify');
const { parsePagination } = require('../utils/pagination');

async function createOrg(req, res, next) {
  try {
    const { name } = req.body;
    const slug = generateSlug(name);

    const org = await Organization.create({ name, slug });

    return success(res, org, 'Organization created', 201);
  } catch (err) {
    next(err);
  }
}

async function listOrgs(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.status) filter.status = req.query.status;

    const [docs, total] = await Promise.all([
      Organization.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Organization.countDocuments(filter),
    ]);

    return paginated(res, { docs, total, page, limit });
  } catch (err) {
    next(err);
  }
}

async function getOrg(req, res, next) {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return error(res, 'Organization not found', 404, 'NOT_FOUND');

    return success(res, org);
  } catch (err) {
    next(err);
  }
}

async function updateOrg(req, res, next) {
  try {
    const updates = { ...req.body };

    if (updates.name) {
      updates.slug = generateSlug(updates.name);
    }

    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!org) return error(res, 'Organization not found', 404, 'NOT_FOUND');

    return success(res, org, 'Organization updated');
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrg, listOrgs, getOrg, updateOrg };
