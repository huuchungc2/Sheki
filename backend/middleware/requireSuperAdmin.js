function requireSuperAdmin(req, res, next) {
  if (req.user?.is_super_admin) return next();
  return res.status(403).json({ error: 'Chỉ super admin mới được phép' });
}

module.exports = requireSuperAdmin;

