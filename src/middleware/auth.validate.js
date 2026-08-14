/**
 * Request validation middleware generator.
 *
 * @param {Object|Function} schema - Validation schema or custom validator.
 * @returns {import('express').RequestHandler} Express middleware function.
 */
export function validate(schema) {
    return (req, res, next) => {
        if (!schema) {
            return next();
        }

        if (typeof schema.parse === 'function') {
            try {
                schema.parse({
                    body: req.body,
                    query: req.query,
                    params: req.params,
                });
                return next();
            } catch (error) {
                return res.status(400).json({ error: 'Validation failed', details: error.errors || error.message });
            }
        }

        if (typeof schema === 'function') {
            const result = schema(req.body);
            if (result && result.error) {
                return res.status(400).json({ error: result.error });
            }
            return next();
        }

        if (schema.body) {
            for (const field of Object.keys(schema.body)) {
                const rule = schema.body[field];
                const value = req.body?.[field];

                if (rule.required && (value === undefined || value === null || value === '')) {
                    return res.status(400).json({ error: `Field '${field}' is required.` });
                }

                if (rule.type && typeof value !== rule.type) {
                    return res.status(400).json({ error: `Field '${field}' must be of type ${rule.type}.` });
                }
            }
        }

        return next();
    };
}
