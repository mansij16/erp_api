const AuditLog = require("../models/AuditLog");

const auditMiddleware = async (req, res, next) => {
  // Store original send function
  const originalSend = res.send;

  // Store request start time
  req.startTime = Date.now();

  // Override send function to capture response
  res.send = function (data) {
    res.responseBody = data;
    originalSend.call(this, data);
  };

  // Continue with request
  res.on("finish", async () => {
    // Only log for modification operations
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      res.statusCode < 400
    ) {
      try {
        const auditEntry = {
          userId: "super_admin",
          action: getActionFromMethod(req.method),
          entity: getEntityFromPath(req.path),
          entityId: req.params.id || null,
          changes: {
            before: req.body.before || null,
            after: req.body,
          },
          ipAddress: req.ip,
          timestamp: new Date(),
        };

        await AuditLog.create(auditEntry);
      } catch (error) {
        console.error("Audit log error:", error);
      }
    }
  });

  next();
};

const getActionFromMethod = (method) => {
  const actionMap = {
    POST: "Create",
    PUT: "Update",
    PATCH: "Update",
    DELETE: "Delete",
  };
  return actionMap[method] || "Unknown";
};

const getEntityFromPath = (path) => {
  const pathParts = path.split("/").filter(Boolean);
  if (pathParts.length >= 3) {
    return pathParts[2]; // /api/v1/[entity]
  }
  return "Unknown";
};

module.exports = auditMiddleware;
