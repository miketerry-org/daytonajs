// tenant-middleware.js

export default function tenantMiddleware(tenants = []) {
  return (req, res, next) => {
    const host = req.hostname.toLowerCase();
    const tenant = tenants.find(t => t.domain === host);
    if (!tenant) return res.status(404).send("Tenant not found");
    req.tenant = tenant;
    next();
  };
}
