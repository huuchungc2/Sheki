function authorize(...allowed) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }

    const ok = allowed.some((a) => {
      if (a === 'admin') return !!req.user.can_access_admin;
      return req.user.role === a;
    });

    if (!ok) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    next();
  };
}

module.exports = authorize;
