export function validate(schema) {
  return async (req, res, next) => {
    try {
      if (schema.body && req.body) {
        // Defensive unwrap if client accidentally nested registration/auth payload in `name`
        if (req.body.name && typeof req.body.name === 'object' && !req.body.email && (req.body.name.email || req.body.name.name)) {
          req.body = { ...req.body.name, ...req.body };
          if (typeof req.body.name === 'object' && req.body.name?.name) {
            req.body.name = req.body.name.name;
          }
        }
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query && req.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params && req.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error.errors) {
        const errorDetails = error.errors.map(err => {
          const field = err.path.join('.');
          let message = err.message;
          if (message === 'Expected string, received object') {
            message = `Invalid format for ${field || 'field'}: expected text but received an object.`;
          }
          return {
            field,
            message
          };
        });
        return res.status(400).json({
          success: false,
          message: errorDetails[0]?.message || 'Validation failed',
          error: 'VALIDATION_ERROR',
          details: errorDetails
        });
      }
      next(error);
    }
  };
}
