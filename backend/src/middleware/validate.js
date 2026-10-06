export function validate(schema) {
  return async (req, res, next) => {
    try {
      if (schema.body && req.body) {
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
        const errorDetails = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
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
